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

/**
 * GET /api/cron/match-reminder-2h
 *
 * Runs every 30 minutes (vercel.json cron).
 * For each match starting in 115–135 min (2h ± 10min window):
 *   1. Find users with matching preferred_competitions + notif_pre_match_2h = true.
 *   2. Exclude already notified (dedup via push_logs pre_match_2h index).
 *   3. Send push + log.
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();
  const now = new Date();
  // 2h window: 115min → 135min from now (30min cron cadence)
  const windowStart = new Date(now.getTime() + 115 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 135 * 60 * 1000);

  const { data: matches, error: matchErr } = await admin
    .from("matches")
    .select("id, team_home, team_away, start_time, competition_id")
    .eq("status", "upcoming")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (matchErr) {
    log.error("match-reminder-2h", "fetch matches error", matchErr.message);
    return errorResponse("Erreur récupération matchs", 500);
  }

  if (!matches?.length) return successResponse({ ok: true, processed: 0 });

  let totalSent = 0;

  for (const match of matches) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, preferred_competitions")
      .eq("notif_pre_match_2h", true);

    if (!profiles?.length) continue;

    const competitionId = match.competition_id;
    let eligibleUserIds = profiles
      .filter((p) => {
        if (!competitionId) return true;
        const prefs = p.preferred_competitions;
        if (!prefs || prefs.length === 0) return true;
        return prefs.includes(competitionId);
      })
      .map((p) => p.id);

    if (eligibleUserIds.length === 0) continue;

    // Dedup: skip users already notified for this match (pre_match_2h)
    const { data: alreadyLogged } = await admin
      .from("push_logs")
      .select("user_id")
      .in("user_id", eligibleUserIds)
      .eq("match_id", match.id)
      .eq("type", "pre_match_2h");

    const alreadyNotified = new Set(
      (alreadyLogged ?? []).map((r) => r.user_id),
    );
    eligibleUserIds = eligibleUserIds.filter((id) => !alreadyNotified.has(id));

    if (eligibleUserIds.length === 0) continue;

    const sent = await sendPushToUsers(eligibleUserIds, {
      title: `⚽ ${match.team_home} – ${match.team_away} dans 2h !`,
      body: "Fais ton prono maintenant avant le coup d'envoi →",
      url: `/pronos`,
    });

    if (sent > 0) {
      await logPushSent(
        admin,
        eligibleUserIds.slice(0, sent).map((uid) => ({
          user_id: uid,
          match_id: match.id,
          type: "pre_match_2h",
        })),
      );
      totalSent += sent;
    }

    log.info(
      "match-reminder-2h",
      `match=${match.id} eligible=${eligibleUserIds.length} sent=${sent}`,
    );
  }

  return successResponse({ ok: true, processed: matches.length, totalSent });
}
