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
} from "@/services/api-football-sync";
import type { MatchStatus } from "@/types/database";

export const dynamic = "force-dynamic";

/** Statuts API-Football : fin de rencontre → sync timeline complète puis on ne repolle plus (`finished` en base). */
const END_STATUS_SHORT = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

/** Délai entre deux `syncApiFootballMatch` (plan PRO : défaut plus bas que le cron live gratuit). */
function monitorSyncThrottleMs(): number {
  const raw = process.env.MATCH_MONITOR_THROTTLE_MS?.trim();
  if (raw !== undefined && raw !== "") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 60_000) return n;
  }
  return 2500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret === undefined || secret === "") {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === null || !auth.toLowerCase().startsWith("bearer ")) {
    return false;
  }
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) {
    return false;
  }
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
};

function mergeById(rows: MonitorRow[]): MonitorRow[] {
  const map = new Map<string, MonitorRow>();
  for (const r of rows) {
    map.set(r.id, r);
  }
  return [...map.values()];
}

/** Entre 0 et 45 min avant le coup d’envoi (strictement avant KO). */
function isWithin45MinBeforeKickoff(startTimeIso: string, now: Date): boolean {
  const t = new Date(startTimeIso).getTime();
  const until = t - now.getTime();
  return until >= 0 && until <= 45 * 60 * 1000;
}

/** Compos manquantes : avant coup d’envoi (≤ 45 min) ou match déjà engagé sans lignes. */
function shouldTryLineupBackfill(m: MonitorRow, hasLineups: boolean, now: Date): boolean {
  if (hasLineups) return false;
  if (isWithin45MinBeforeKickoff(m.start_time, now)) return true;
  if (
    m.status === "first_half" ||
    m.status === "half_time" ||
    m.status === "second_half" ||
    m.status === "paused"
  ) {
    return true;
  }
  return false;
}

/**
 * GET /api/cron/match-monitor
 * Cycle de vie matchs : matchs actifs (≤ 45 min avant KO ou statut mi-temps / mi-match),
 * `GET /fixtures` par lot (`ids`), mise à jour `status` / `home_score` / `away_score` / `match_minute`,
 * backfill compos via `syncApiFootballMatch` si besoin, sync complète timeline en fin (`FT`…).
 *
 * Auth : **`Authorization: Bearer <CRON_SECRET>`** uniquement (pas d’accès modérateur).
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 45 * 60 * 1000);
  const upcomingSkew = new Date(now.getTime() - 10 * 60 * 1000);

  const selectCols = "id, start_time, status, api_football_id";

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
  const throttle = monitorSyncThrottleMs();

  const summary = {
    activeMatchCount: active.length,
    fixtureApiCalls: 0,
    matchesPatchedFromFixture: 0,
    fullSyncOnEndCount: 0,
    lineupBackfillCount: 0,
    errors: [] as string[],
  };

  if (active.length === 0) {
    return successResponse(summary);
  }

  const matchIds = active.map((m) => m.id);
  const withLineups = new Set<string>();
  const chunk = 200;
  for (let i = 0; i < matchIds.length; i += chunk) {
    const slice = matchIds.slice(i, i + chunk);
    const { data: lu, error: luErr } = await admin.from("lineups").select("match_id").in("match_id", slice);
    if (luErr) {
      summary.errors.push(`lineups: ${luErr.message}`);
      break;
    }
    for (const row of lu ?? []) {
      withLineups.add(row.match_id);
    }
  }

  const withFixture = active.filter((m) => m.api_football_id != null) as (MonitorRow & {
    api_football_id: number;
  })[];

  const fixtureIdToMatchId = new Map<number, string>();
  for (const m of withFixture) {
    fixtureIdToMatchId.set(m.api_football_id, m.id);
  }

  const idsBatchSize = 20;
  const shortByMatchId = new Map<string, string>();

  for (let i = 0; i < withFixture.length; i += idsBatchSize) {
    const batch = withFixture.slice(i, i + idsBatchSize);
    const idsParam = batch.map((m) => String(m.api_football_id)).join("-");
    let payload: unknown;
    try {
      payload = await fetchApiFootball<unknown>("fixtures", { ids: idsParam });
    } catch (err) {
      summary.errors.push(
        `fixtures ids=${idsParam}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    summary.fixtureApiCalls += 1;

    const list = extractFixtureList(payload);
    for (const item of list) {
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
      if (upErr) {
        summary.errors.push(`update match ${matchId}: ${upErr.message}`);
        continue;
      }
      summary.matchesPatchedFromFixture += 1;
    }
  }

  let throttleBeforeNextSync = false;
  for (const m of active) {
    const fid = m.api_football_id;
    if (fid == null) continue;

    const short = (shortByMatchId.get(m.id) ?? "").toUpperCase();
    const ended = END_STATUS_SHORT.has(short);

    if (ended) {
      if (throttleBeforeNextSync) await delay(throttle);
      throttleBeforeNextSync = true;
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
      continue;
    }

    if (shouldTryLineupBackfill(m, withLineups.has(m.id), now)) {
      if (throttleBeforeNextSync) await delay(throttle);
      throttleBeforeNextSync = true;
      try {
        const r = await syncApiFootballMatch(m.id);
        if (r.skippedReason) {
          summary.errors.push(`lineupSync ${m.id}: ${r.skippedReason}`);
        } else {
          summary.lineupBackfillCount += 1;
          if (r.lineupsInserted > 0) withLineups.add(m.id);
        }
      } catch (err) {
        summary.errors.push(`lineupSync ${m.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return successResponse(summary);
}
