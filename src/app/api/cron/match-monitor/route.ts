import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { fetchApiFootball } from "@/lib/api-football-client";
import {
  extractFixtureList,
  fixtureApiStatusShortFromRow,
  num,
  patchMatchFromFixtureRow,
  syncApiFootballMatch,
  syncMatchEvents,
  syncMatchStatistics,
  syncMatchLineups,
} from "@/services/api-football-sync";
import type { MatchStatus } from "@/types/database";

export const dynamic = "force-dynamic";

/** Statuts API-Football : fin de rencontre → orchestrateur FT complet. */
const END_STATUS_SHORT = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

/** Statuts API-Football : match en cours → syncMatchEvents à chaque tick. */
const LIVE_STATUS_SHORT = new Set(["1H", "2H", "HT", "ET", "BT", "P"]);

/** Heartbeat stats : resync toutes les 5 min. */
const STATS_HEARTBEAT_MS = 5 * 60 * 1000;

/**
 * Délai entre deux appels `syncMatchEvents` consécutifs (inter-match).
 * Configurable via `MATCH_MONITOR_EVENTS_DELAY_MS` (défaut 200 ms — plan PRO).
 */
function eventsInterMatchDelayMs(): number {
  const raw = process.env.MATCH_MONITOR_EVENTS_DELAY_MS?.trim();
  if (raw !== undefined && raw !== "") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 5000) return n;
  }
  return 200;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret === undefined || secret === "") return false;
  const auth = request.headers.get("authorization");
  if (auth === null || !auth.toLowerCase().startsWith("bearer ")) return false;
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

type MonitorRow = {
  id: string;
  start_time: string;
  status: MatchStatus;
  api_football_id: number | null;
  home_score: number;
  away_score: number;
  has_lineups: boolean;
  last_stats_sync_at: string | null;
};

function mergeById(rows: MonitorRow[]): MonitorRow[] {
  const map = new Map<string, MonitorRow>();
  for (const r of rows) map.set(r.id, r);
  return [...map.values()];
}

function isWithin45MinBeforeKickoff(startTimeIso: string, now: Date): boolean {
  const t = new Date(startTimeIso).getTime();
  const until = t - now.getTime();
  return until >= 0 && until <= 45 * 60 * 1000;
}

function needsLineupBackfill(m: MonitorRow, now: Date): boolean {
  if (m.has_lineups) return false;
  if (isWithin45MinBeforeKickoff(m.start_time, now)) return true;
  return (
    m.status === "first_half" ||
    m.status === "half_time" ||
    m.status === "second_half" ||
    m.status === "paused"
  );
}

function needsStatsHeartbeat(m: MonitorRow): boolean {
  if (m.last_stats_sync_at == null) return true;
  return Date.now() - new Date(m.last_stats_sync_at).getTime() > STATS_HEARTBEAT_MS;
}

/**
 * GET /api/cron/match-monitor
 *
 * Boucle unique à chaque tick (~1 min) :
 *   1. Fixture batch  — met à jour score/statut/minute pour tous les matchs actifs.
 *   2. Events (haute fréquence) — syncMatchEvents pour TOUS les matchs LIVE, 200 ms entre chaque.
 *   3. Stats (heartbeat 5 min) — syncMatchStatistics si last_stats_sync_at > 5 min.
 *   4. Lineups (backfill unique) — syncMatchLineups si has_lineups = false et match proche.
 *   5. FT — syncApiFootballMatch (orchestrateur complet) sur les matchs terminés.
 *
 * Auth : `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 45 * 60 * 1000);
  const upcomingSkew = new Date(now.getTime() - 10 * 60 * 1000);

  const selectCols =
    "id, start_time, status, api_football_id, home_score, away_score, has_lineups, last_stats_sync_at";

  const [{ data: upcomingSoon, error: e1 }, { data: inPlay, error: e2 }] = await Promise.all([
    admin
      .from("matches")
      .select(selectCols)
      .eq("status", "upcoming")
      .not("api_football_id", "is", null)
      .lte("start_time", soon.toISOString())
      .gte("start_time", upcomingSkew.toISOString()),
    admin
      .from("matches")
      .select(selectCols)
      .in("status", ["first_half", "half_time", "second_half", "paused"])
      .not("api_football_id", "is", null),
  ]);

  if (e1) return errorResponse(`matches (à venir): ${e1.message}`, 500);
  if (e2) return errorResponse(`matches (en jeu): ${e2.message}`, 500);

  const active = mergeById([...(upcomingSoon ?? []), ...(inPlay ?? [])] as MonitorRow[]);

  const summary = {
    activeMatchCount: active.length,
    fixtureApiCalls: 0,
    matchesPatchedFromFixture: 0,
    eventsSyncCount: 0,
    statsSyncCount: 0,
    lineupBackfillCount: 0,
    fullSyncOnEndCount: 0,
    errors: [] as string[],
  };

  if (active.length === 0) return successResponse(summary);

  const withFixture = active.filter((m) => m.api_football_id != null) as (MonitorRow & {
    api_football_id: number;
  })[];

  const fixtureIdToMatchId = new Map<number, string>();
  for (const m of withFixture) fixtureIdToMatchId.set(m.api_football_id, m.id);

  const scoreByMatchId = new Map<string, { home: number; away: number }>();
  for (const m of active) scoreByMatchId.set(m.id, { home: m.home_score ?? 0, away: m.away_score ?? 0 });

  // ── 1. Fixture batch : mise à jour score / statut / minute ────────────────
  const shortByMatchId = new Map<string, string>();
  const idsBatchSize = 20;

  for (let i = 0; i < withFixture.length; i += idsBatchSize) {
    const batch = withFixture.slice(i, i + idsBatchSize);
    const idsParam = batch.map((m) => String(m.api_football_id)).join("-");
    let payload: unknown;
    try {
      payload = await fetchApiFootball<unknown>("fixtures", { ids: idsParam });
    } catch (err) {
      summary.errors.push(`fixtures ids=${idsParam}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    summary.fixtureApiCalls += 1;

    for (const item of extractFixtureList(payload)) {
      const row = item as Record<string, unknown>;
      const fixture = row.fixture as Record<string, unknown> | undefined;
      const fid = num(fixture?.id);
      if (fid == null) continue;
      const matchId = fixtureIdToMatchId.get(fid);
      if (matchId == null) continue;

      const short = fixtureApiStatusShortFromRow(row);
      shortByMatchId.set(matchId, short);

      const patch = patchMatchFromFixtureRow(row);
      const { error: upErr } = await admin.from("matches").update(patch).eq("id", matchId);
      if (upErr) { summary.errors.push(`update match ${matchId}: ${upErr.message}`); continue; }
      scoreByMatchId.set(matchId, { home: patch.home_score ?? 0, away: patch.away_score ?? 0 });
      summary.matchesPatchedFromFixture += 1;
    }
  }

  const interDelay = eventsInterMatchDelayMs();

  // ── 2. Events haute fréquence — TOUS les matchs LIVE, chaque tick ─────────
  const liveMatches = active.filter((m) => {
    const short = (shortByMatchId.get(m.id) ?? "").toUpperCase();
    return LIVE_STATUS_SHORT.has(short);
  });

  for (let i = 0; i < liveMatches.length; i++) {
    if (i > 0 && interDelay > 0) await delay(interDelay);
    const m = liveMatches[i]!;
    try {
      const r = await syncMatchEvents(m.id);
      if (r.skippedReason) {
        summary.errors.push(`events ${m.id}: ${r.skippedReason}`);
      } else {
        summary.eventsSyncCount += 1;
      }
    } catch (err) {
      summary.errors.push(`events ${m.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 3. Stats heartbeat (5 min) ────────────────────────────────────────────
  for (const m of liveMatches) {
    if (!needsStatsHeartbeat(m)) continue;
    try {
      const r = await syncMatchStatistics(m.id);
      if (r.skippedReason) {
        summary.errors.push(`stats ${m.id}: ${r.skippedReason}`);
      } else {
        summary.statsSyncCount += 1;
      }
    } catch (err) {
      summary.errors.push(`stats ${m.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 4. Backfill compos (une seule fois par match) ─────────────────────────
  for (const m of active) {
    if (!needsLineupBackfill(m, now)) continue;
    try {
      const r = await syncMatchLineups(m.id);
      if (r.skippedReason) {
        summary.errors.push(`lineups ${m.id}: ${r.skippedReason}`);
      } else {
        summary.lineupBackfillCount += 1;
      }
    } catch (err) {
      summary.errors.push(`lineups ${m.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 5. FT — sync finale complète (orchestrateur) ──────────────────────────
  for (const m of active) {
    const short = (shortByMatchId.get(m.id) ?? "").toUpperCase();
    if (!END_STATUS_SHORT.has(short)) continue;
    console.log(`[monitor] Full FT sync: Match ${m.id}`);
    try {
      const r = await syncApiFootballMatch(m.id);
      if (r.skippedReason) {
        summary.errors.push(`fullSync ${m.id}: ${r.skippedReason}`);
      } else {
        summary.fullSyncOnEndCount += 1;
      }
    } catch (err) {
      summary.errors.push(`fullSync ${m.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return successResponse(summary);
}
