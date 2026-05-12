import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { getBudgetExceededUsers, logPushSent } from "@/lib/push-budget";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isNightMatch(startTimeIso: string): boolean {
  const h = new Date(startTimeIso).getUTCHours();
  return h >= 21 || h < 6;
}

type MatchSlim = {
  id: string;
  team_home: string;
  team_away: string;
  start_time: string;
  competition_id: string | null;
};

/**
 * GET /api/cron/match-imminent
 *
 * Runs every 2 minutes (vercel.json cron).
 * Groups ALL matches starting in 5–8 min into a SINGLE push per user (bundled).
 * Segments message: users with a prono get "bonne chance", others get "dernière chance".
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 5 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 8 * 60 * 1000);

  const { data: imminentMatches, error: matchErr } = await admin
    .from("matches")
    .select("id, team_home, team_away, start_time, competition_id")
    .eq("status", "upcoming")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (matchErr) {
    log.error("match-imminent", "fetch matches error", matchErr.message);
    return errorResponse("Erreur récupération matchs", 500);
  }

  if (!imminentMatches?.length) {
    return successResponse({ ok: true, processed: 0 });
  }

  // Filter night matches
  const activeMatches = imminentMatches.filter(
    (m) => !isNightMatch(m.start_time),
  ) as MatchSlim[];

  if (!activeMatches.length) {
    return successResponse({ ok: true, processed: 0, sent: 0 });
  }

  // Fetch all users with notif_pre_match_5min = true
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, preferred_competitions")
    .eq("notif_pre_match_5min", true);

  if (!profiles?.length) {
    return successResponse({
      ok: true,
      processed: activeMatches.length,
      sent: 0,
    });
  }

  const allUserIds = profiles.map((p) => p.id);
  const matchIds = activeMatches.map((m) => m.id);

  // Dedup: users already notified for each match
  const { data: alreadyLogged } = await admin
    .from("push_logs")
    .select("user_id, match_id")
    .in("user_id", allUserIds)
    .in("match_id", matchIds)
    .eq("type", "pre_match");

  const notifiedKey = new Set(
    (alreadyLogged ?? []).map((r) => `${r.user_id}:${r.match_id}`),
  );

  const [budgetExceeded, { data: pronosData }] = await Promise.all([
    getBudgetExceededUsers(admin, allUserIds),
    admin
      .from("pronos")
      .select("user_id, match_id")
      .in("match_id", matchIds)
      .in("user_id", allUserIds),
  ]);

  const pronoKey = new Set(
    (pronosData ?? []).map((p) => `${p.user_id}:${p.match_id}`),
  );

  // Per user: collect which matches they still need to be notified about
  const userMatchMap = new Map<string, MatchSlim[]>();

  for (const profile of profiles) {
    if (budgetExceeded.has(profile.id)) continue;

    const prefCompSet = profile.preferred_competitions?.length
      ? new Set(profile.preferred_competitions)
      : null;

    const eligible = activeMatches.filter((m) => {
      if (notifiedKey.has(`${profile.id}:${m.id}`)) return false;
      if (m.competition_id && prefCompSet) {
        if (!prefCompSet.has(m.competition_id)) return false;
      }
      return true;
    });

    if (eligible.length > 0) userMatchMap.set(profile.id, eligible);
  }

  if (userMatchMap.size === 0) {
    return successResponse({
      ok: true,
      processed: activeMatches.length,
      sent: 0,
    });
  }

  // Group users by identical push payload to batch sendPushToUsers calls
  type PushJob = {
    tag: string;
    title: string;
    body: string;
    url: string;
    userIds: string[];
    matchesForUsers: Map<string, MatchSlim[]>;
  };
  const jobMap = new Map<string, PushJob>();

  for (const [userId, matches] of userMatchMap) {
    let key: string;
    let tag: string;
    let title: string;
    let body: string;
    let url: string;

    if (matches.length > 1) {
      const names = matches
        .slice(0, 2)
        .map((m) => `${m.team_home}–${m.team_away}`)
        .join(", ");
      const suffix =
        matches.length > 2 ? ` et ${matches.length - 2} autres` : "";
      tag = "pre-match-bundle";
      title = `🔴 ${matches.length} matchs dans 5 min !`;
      body = names + suffix;
      url = "/lobby";
      key = `bundle:${matches
        .map((m) => m.id)
        .sort()
        .join(",")}`;
    } else {
      const match = matches[0];
      const hasProno = pronoKey.has(`${userId}:${match.id}`);
      tag = `pre-match-${match.id}`;
      title = "🔴 Match imminent !";
      body = hasProno
        ? `${match.team_home}–${match.team_away} dans 5 min. Ton prono est prêt — bonne chance ! 🤞`
        : `${match.team_home}–${match.team_away} dans 5 min — dernière chance de pronostiquer !`;
      url = `/match/${match.id}`;
      key = `single:${match.id}:${hasProno ? "1" : "0"}`;
    }

    if (!jobMap.has(key)) {
      jobMap.set(key, {
        tag,
        title,
        body,
        url,
        userIds: [],
        matchesForUsers: new Map(),
      });
    }
    const job = jobMap.get(key)!;
    job.userIds.push(userId);
    job.matchesForUsers.set(userId, matches);
  }

  // Send + log
  let totalSent = 0;
  const logsToWrite: { user_id: string; match_id: string; type: string }[] = [];

  for (const job of jobMap.values()) {
    const sent = await sendPushToUsers(job.userIds, {
      title: job.title,
      body: job.body,
      url: job.url,
      tag: job.tag,
    });
    totalSent += sent;

    for (const userId of job.userIds) {
      for (const match of job.matchesForUsers.get(userId) ?? []) {
        logsToWrite.push({
          user_id: userId,
          match_id: match.id,
          type: "pre_match",
        });
      }
    }
  }

  if (logsToWrite.length > 0) {
    await logPushSent(admin, logsToWrite);
  }

  log.info(
    "match-imminent",
    `matches=${activeMatches.length} users=${userMatchMap.size} sent=${totalSent}`,
  );

  return successResponse({
    ok: true,
    processed: activeMatches.length,
    sent: totalSent,
  });
}
