import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { syncPlayerOddsForMatch } from "@/services/api-football-odds-sync";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
 * GET /api/cron/sync-player-odds
 *
 * Syncs scorer odds (anytime + first goal) from API-Football for all upcoming
 * matches starting in the next 48h. Designed to run daily at 10:00 UTC.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: matches, error } = await admin
    .from("matches")
    .select("id, api_football_id, team_home, team_away")
    .eq("status", "upcoming")
    .not("api_football_id", "is", null)
    .gte("start_time", now.toISOString())
    .lte("start_time", in48h.toISOString())
    .order("start_time", { ascending: true });

  if (error) return errorResponse(error.message, 500);
  if (!matches?.length)
    return successResponse({ total: 0, synced: 0, skipped: 0, errors: 0 });

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const match of matches) {
    if (!match.api_football_id) {
      skipped++;
      continue;
    }
    try {
      const count = await syncPlayerOddsForMatch(
        match.id,
        match.api_football_id,
      );
      if (count > 0) {
        log.info(
          "cron-sync-player-odds",
          `match=${match.id} (${match.team_home}–${match.team_away}) players=${count}`,
        );
        synced++;
      } else {
        skipped++;
      }
    } catch (err) {
      log.error(
        "cron-sync-player-odds",
        `match=${match.id} error`,
        err instanceof Error ? err.message : String(err),
      );
      errors++;
    }
  }

  return successResponse({ total: matches.length, synced, skipped, errors });
}
