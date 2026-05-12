import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { logPushSent } from "@/lib/push-budget";
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

/**
 * GET /api/cron/match-imminent-30min
 *
 * Runs every 5 minutes (cron-job.org).
 * For each match starting in 25–35 min:
 *   1. Skip night matches (23h–8h Paris).
 *   2. Find users with notif_pre_match_5min = true + preferred_competitions filter.
 *   3. Exclude users already notified (pre_match_30min dedup).
 *   4. Send a warm-up push: "Active le Mode Stade maintenant →".
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

  const { data: matches, error: matchErr } = await admin
    .from("matches")
    .select("id, team_home, team_away, start_time, competition_id")
    .eq("status", "upcoming")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (matchErr) {
    log.error("match-30min", "fetch matches error", matchErr.message);
    return errorResponse("Erreur récupération matchs", 500);
  }

  if (!matches?.length) return successResponse({ ok: true, processed: 0 });

  const activeMatches = matches.filter((m) => !isNightMatch(m.start_time));
  if (!activeMatches.length) {
    return successResponse({ ok: true, processed: 0, sent: 0 });
  }

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

  // Dedup: already notified for the 30min push for these matches
  const { data: alreadyLogged } = await admin
    .from("push_logs")
    .select("user_id, match_id")
    .in("user_id", allUserIds)
    .in("match_id", matchIds)
    .eq("type", "pre_match_30min");

  const notifiedKey = new Set(
    (alreadyLogged ?? []).map((r) => `${r.user_id}:${r.match_id}`),
  );

  // Per user: collect eligible new matches
  const userMatchMap = new Map<string, typeof activeMatches>();

  for (const profile of profiles) {
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

  // Group users by same payload (same set of matches)
  type PushJob = {
    tag: string;
    title: string;
    body: string;
    url: string;
    userIds: string[];
    matchesPerUser: Map<string, typeof activeMatches>;
  };
  const jobMap = new Map<string, PushJob>();

  for (const [userId, uMatches] of userMatchMap) {
    let key: string;
    let tag: string;
    let title: string;
    let body: string;
    let url: string;

    if (uMatches.length > 1) {
      tag = "pre-match-30min-bundle";
      title = `⏰ ${uMatches.length} matchs dans 30 min !`;
      body =
        uMatches
          .slice(0, 2)
          .map((m) => `${m.team_home}–${m.team_away}`)
          .join(", ") + (uMatches.length > 2 ? ` +${uMatches.length - 2}` : "");
      url = "/lobby";
      key = `bundle:${uMatches
        .map((m) => m.id)
        .sort()
        .join(",")}`;
    } else {
      const m = uMatches[0];
      tag = `pre-match-30min-${m.id}`;
      title = `⏰ ${m.team_home}–${m.team_away} dans 30 min`;
      body = "Active le Mode Stade maintenant pour ne rater aucune action VAR.";
      url = `/match/${m.id}`;
      key = `single:${m.id}`;
    }

    if (!jobMap.has(key)) {
      jobMap.set(key, {
        tag,
        title,
        body,
        url,
        userIds: [],
        matchesPerUser: new Map(),
      });
    }
    const job = jobMap.get(key)!;
    job.userIds.push(userId);
    job.matchesPerUser.set(userId, uMatches);
  }

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
      for (const m of job.matchesPerUser.get(userId) ?? []) {
        logsToWrite.push({
          user_id: userId,
          match_id: m.id,
          type: "pre_match_30min",
        });
      }
    }
  }

  if (logsToWrite.length > 0) {
    await logPushSent(admin, logsToWrite);
  }

  log.info(
    "match-30min",
    `matches=${activeMatches.length} users=${userMatchMap.size} sent=${totalSent}`,
  );

  return successResponse({
    ok: true,
    processed: activeMatches.length,
    sent: totalSent,
  });
}
