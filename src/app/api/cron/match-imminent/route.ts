import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import {
  getBudgetExceededUsers,
  getAlreadyNotifiedUsers,
  logPushSent,
} from "@/lib/push-budget";
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

/** Returns true if the match start hour (UTC) falls in the night guard window (21:00–05:59 UTC ≈ 23:00–07:59 Paris summer). */
function isNightMatch(startTimeIso: string): boolean {
  const h = new Date(startTimeIso).getUTCHours();
  return h >= 21 || h < 6;
}

/**
 * GET /api/cron/match-imminent
 *
 * Runs every 2 minutes (vercel.json cron).
 * For each match starting in 5–8 min:
 *   1. Skip night matches (23h–8h Paris).
 *   2. Find users with matching preferred_competitions and notif_pre_match_5min = true.
 *   3. Exclude users already notified for this match.
 *   4. Exclude users who hit their daily push budget.
 *   5. Send push & log.
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 5 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 8 * 60 * 1000);

  // Find upcoming matches in the 5–8 min window
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

  let totalSent = 0;

  for (const match of imminentMatches) {
    // Night guard: skip matches starting between 23:00–07:59 Paris (≈ 21:00–05:59 UTC)
    if (isNightMatch(match.start_time)) {
      log.info("match-imminent", `Skipping night match ${match.id}`);
      continue;
    }

    // Find users with notif_pre_match_5min = true
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, preferred_competitions")
      .eq("notif_pre_match_5min", true);
    if (!profiles?.length) continue;

    // Filter by preferred_competitions (null/empty = all competitions)
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

    // Exclude already notified users for this match
    const alreadyNotified = await getAlreadyNotifiedUsers(
      admin,
      eligibleUserIds,
      match.id,
    );
    eligibleUserIds = eligibleUserIds.filter((id) => !alreadyNotified.has(id));
    if (eligibleUserIds.length === 0) continue;

    // Exclude users who hit their daily push budget
    const budgetExceeded = await getBudgetExceededUsers(admin, eligibleUserIds);
    eligibleUserIds = eligibleUserIds.filter((id) => !budgetExceeded.has(id));
    if (eligibleUserIds.length === 0) continue;

    // Send push
    const sent = await sendPushToUsers(eligibleUserIds, {
      title: "🔴 Match imminent !",
      body: `${match.team_home} vs ${match.team_away} dans 5 min — Mode Stade activé.`,
      url: `/match/${match.id}`,
      tag: `pre-match-${match.id}`,
    });

    // Log sent pushes for dedup + budget
    await logPushSent(
      admin,
      eligibleUserIds.map((uid) => ({
        user_id: uid,
        match_id: match.id,
        type: "pre_match",
      })),
    );

    totalSent += sent;
    log.info(
      "match-imminent",
      `${match.team_home} vs ${match.team_away}: ${sent} push envoyés`,
    );
  }

  return successResponse({
    ok: true,
    processed: imminentMatches.length,
    sent: totalSent,
  });
}
