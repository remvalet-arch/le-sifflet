/**
 * Sync API-Football v3 — fonctions atomiques indépendantes + orchestrateur FT.
 *
 * Fonctions publiques légères (1 appel API chacune, sans throttle interne) :
 *   syncMatchEvents(matchId)      → /fixtures/events     → match_timeline_events
 *   syncMatchStatistics(matchId)  → /fixtures/statistics → match_statistics
 *   syncMatchLineups(matchId)     → /fixtures/lineups    → lineups
 *
 * Orchestrateur FT (fixture + 3 atomiques en parallèle) :
 *   syncApiFootballMatch(matchId) → utilisé pour les fins de match et la sync admin
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { applyApiFootballSignalsToMarkets } from "@/lib/sports/api-football-market-bridge";
import {
  API_FOOTBALL_BASE_URL,
  fetchApiFootball,
  getApiFootballSeasonYear,
} from "@/lib/api-football-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  MatchStatus,
  TimelineEventType,
} from "@/types/database";

type Admin = SupabaseClient<Database>;

/** Délai inter-appels dans l'orchestrateur FT (plan PRO → 500 ms suffisent). */
const ORCHESTRATOR_CALL_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Limite de matchs traités par exécution `syncLiveMatches` (back-compat sportsdb-sync). */
export const SYNC_LIVE_MAX_MATCHES_PER_RUN = 3;

// ── Types publics ─────────────────────────────────────────────────────────────

export type SyncEventsResult = {
  matchId: string;
  fixtureId: number | null;
  skippedReason?: string;
  timelineUpserted: number;
  /** Ouverture / résolution auto `market_events` (VAR / pénalty) depuis les incidents API. */
  apiMarketSync?: {
    var_goal_opened: boolean;
    var_goal_resolved: boolean;
    penalty_check_opened: boolean;
    penalty_check_resolved: boolean;
    errors: string[];
  };
};

export type SyncStatsResult = {
  matchId: string;
  fixtureId: number | null;
  skippedReason?: string;
  statisticsUpserted: number;
};

export type SyncLineupsResult = {
  matchId: string;
  fixtureId: number | null;
  skippedReason?: string;
  lineupsInserted: number;
};

export type SyncApiFootballMatchResult = {
  matchId: string;
  skippedReason?:
    | "match_not_found"
    | "missing_home_or_away_team_id"
    | "missing_api_football_team_id"
    | "fixture_not_found"
    | "fixture_ambiguous";
  fixtureId: number | null;
  lineupsInserted: number;
  timelineUpserted: number;
  statisticsUpserted: number;
  matchUpdated: boolean;
};

// ── Contexte match (helper interne) ──────────────────────────────────────────

type MatchContext = {
  matchId: string;
  fixtureId: number;
  homeTeamId: string;
  awayTeamId: string;
  homeApiId: number;
  awayApiId: number;
  homeTeamName: string;
  awayTeamName: string;
};

type TeamApiRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "name" | "api_football_id" | "thesportsdb_team_id"
>;

async function fetchTeamsApiByUuid(
  admin: Admin,
  teamUuids: string[],
): Promise<Map<string, TeamApiRow>> {
  const unique = [...new Set(teamUuids.filter(Boolean))];
  const map = new Map<string, TeamApiRow>();
  if (unique.length === 0) return map;
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const { data, error } = await admin
      .from("teams")
      .select("id, name, api_football_id, thesportsdb_team_id")
      .in("id", unique.slice(i, i + chunkSize));
    if (error) throw new Error(`teams by id: ${error.message}`);
    for (const row of data ?? []) map.set(row.id, row);
  }
  return map;
}

/**
 * Résout le contexte nécessaire à tous les syncs atomiques.
 * Retourne null si `api_football_id` ou les équipes sont manquantes.
 */
async function resolveMatchContext(
  admin: Admin,
  matchId: string,
): Promise<MatchContext | null> {
  const { data: match } = await admin
    .from("matches")
    .select(
      "id, team_home, team_away, api_football_id, home_team_id, away_team_id",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!match?.api_football_id || !match.home_team_id || !match.away_team_id)
    return null;

  const teamMap = await fetchTeamsApiByUuid(admin, [
    match.home_team_id,
    match.away_team_id,
  ]);
  const homeTeam = teamMap.get(match.home_team_id);
  const awayTeam = teamMap.get(match.away_team_id);
  if (!homeTeam?.api_football_id || !awayTeam?.api_football_id) return null;

  return {
    matchId,
    fixtureId: match.api_football_id,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeApiId: homeTeam.api_football_id,
    awayApiId: awayTeam.api_football_id,
    homeTeamName: homeTeam.name ?? match.team_home,
    awayTeamName: awayTeam.name ?? match.team_away,
  };
}

// ── Helpers timeline / compos ─────────────────────────────────────────────────

function matchCalendarDateFromStartTime(startTime: string): string {
  const s = startTime.trim();
  const head = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (head?.[1]) {
    const [, ymd] = head;
    const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return ymd;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function mapApiFootballFixtureStatusShort(
  short: string | undefined | null,
): MatchStatus {
  const s = (short ?? "").toUpperCase().trim();
  if (s === "") return "upcoming";
  const finished = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  const upcoming = new Set(["NS", "TBD"]);
  const halfTime = new Set(["HT", "BT"]);
  const paused = new Set(["PST", "CANC", "ABD", "SUSP", "INT", "POSTP"]);
  if (finished.has(s)) return "finished";
  if (upcoming.has(s)) return "upcoming";
  if (halfTime.has(s)) return "half_time";
  if (paused.has(s)) return "paused";
  if (s === "1H" || s === "LIVE") return "first_half";
  if (s === "2H" || s === "ET" || s === "P") return "second_half";
  if (s.startsWith("2")) return "second_half";
  return "first_half";
}

function mapLineupPositionApi(pos: string | null | undefined): string {
  const p = (pos ?? "").toUpperCase().trim();
  if (p === "F") return "A";
  if (p === "G" || p === "D" || p === "M") return p;
  return p === "" ? "M" : p;
}

function normalizeSearchName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function resolvePlayerOrGhost(
  admin: Admin,
  opts: {
    teamId: string;
    teamName: string;
    apiPlayerName: string;
    apiPlayerId: number;
    position: string;
    fixtureId: number;
  },
): Promise<string> {
  const nameTrim = opts.apiPlayerName.trim();
  if (nameTrim === "") {
    const ghostId = `apifb:${String(opts.fixtureId)}:noname:${String(opts.apiPlayerId)}`;
    const { data: ins, error } = await admin
      .from("players")
      .insert({
        thesportsdb_id: ghostId,
        team_thesportsdb_id: null,
        team_name: opts.teamName,
        player_name: "Unknown",
        position: opts.position,
        team_id: opts.teamId,
        synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`ghost player: ${error.message}`);
    return ins!.id;
  }

  const pattern = `%${escapeIlikePattern(nameTrim)}%`;
  const { data: byIlike, error: e1 } = await admin
    .from("players")
    .select("id, player_name")
    .eq("team_id", opts.teamId)
    .ilike("player_name", pattern)
    .limit(5);
  if (e1) throw new Error(`players ilike: ${e1.message}`);
  if (byIlike && byIlike.length > 0) return byIlike[0]!.id;

  const norm = normalizeSearchName(nameTrim);
  if (norm.length >= 2 && norm !== nameTrim.toLowerCase()) {
    const pattern2 = `%${escapeIlikePattern(norm)}%`;
    const { data: byNorm, error: e2 } = await admin
      .from("players")
      .select("id, player_name")
      .eq("team_id", opts.teamId)
      .ilike("player_name", pattern2)
      .limit(5);
    if (e2) throw new Error(`players ilike norm: ${e2.message}`);
    if (byNorm && byNorm.length > 0) return byNorm[0]!.id;
  }

  const ghostId = `apifb:${String(opts.fixtureId)}:${String(opts.apiPlayerId)}`;
  const { data: existing } = await admin
    .from("players")
    .select("id")
    .eq("thesportsdb_id", ghostId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: ins, error } = await admin
    .from("players")
    .insert({
      thesportsdb_id: ghostId,
      team_thesportsdb_id: null,
      team_name: opts.teamName,
      player_name: nameTrim,
      position: opts.position,
      team_id: opts.teamId,
      synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`ghost player insert: ${error.message}`);
  return ins!.id;
}

function teamSideFromApiTeamId(
  eventTeamId: number | null,
  homeApiId: number,
  awayApiId: number,
): "home" | "away" | null {
  if (eventTeamId == null) return null;
  if (eventTeamId === homeApiId) return "home";
  if (eventTeamId === awayApiId) return "away";
  return null;
}

function mapEventToTimeline(
  matchId: string,
  fixtureId: number,
  index: number,
  raw: Record<string, unknown>,
  homeApiId: number,
  awayApiId: number,
): Database["public"]["Tables"]["match_timeline_events"]["Insert"] | null {
  const teamObj = raw.team as Record<string, unknown> | undefined;
  const eventTeamId = num(teamObj?.id);
  const team_side = teamSideFromApiTeamId(eventTeamId, homeApiId, awayApiId);
  if (team_side == null) return null;

  const time = raw.time as Record<string, unknown> | undefined;
  const elapsed = num(time?.elapsed) ?? 0;
  const extra = num(time?.extra) ?? 0;
  const minute = Math.min(120, Math.max(0, elapsed + extra));

  const typeStr = String(raw.type ?? "").toLowerCase();
  const detailStr = String(raw.detail ?? "");
  const detailLower = detailStr.toLowerCase();

  let event_type: TimelineEventType = "info";
  if (typeStr === "goal") event_type = "goal";
  else if (typeStr === "card") {
    if (detailLower.includes("red")) event_type = "red_card";
    else if (detailLower.includes("yellow")) event_type = "yellow_card";
    else event_type = "info";
  } else if (typeStr === "subst") event_type = "substitution";

  const player = raw.player as Record<string, unknown> | undefined;
  const playerName =
    typeof player?.name === "string" && player.name.trim() !== ""
      ? player.name.trim()
      : "—";

  const assist = raw.assist as Record<string, unknown> | undefined;
  const assistName =
    typeof assist?.name === "string" && assist.name.trim() !== ""
      ? assist.name.trim()
      : null;

  let details: string | null = null;
  if (assistName && typeStr === "subst")
    details = JSON.stringify({ assist: assistName, detail: detailStr });
  else if (detailStr && event_type === "info")
    details = `${String(raw.type ?? "")}: ${detailStr}`;
  else if (assistName)
    details = JSON.stringify({ assist: assistName, detail: detailStr });

  const is_own_goal = event_type === "goal" && detailLower.includes("own goal");

  const api_football_event_id = `af:${String(fixtureId)}:${String(minute)}:${String(index)}:${typeStr}:${String(
    player?.id ?? "",
  )}:${detailStr.slice(0, 40)}`;

  return {
    match_id: matchId,
    event_type,
    minute,
    team_side,
    player_name: playerName,
    is_own_goal,
    details,
    thesportsdb_event_id: null,
    api_football_event_id,
  };
}

export function extractFixtureList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const r = (payload as Record<string, unknown>).response;
  return Array.isArray(r) ? r : [];
}

function pickFixtureIdStrict(
  rows: unknown[],
  homeApiId: number,
  awayApiId: number,
): { fixtureId: number } | "none" | "ambiguous" {
  const matches: number[] = [];
  for (const item of rows) {
    const row = item as Record<string, unknown>;
    const teams = row.teams as Record<string, unknown> | undefined;
    const fixture = row.fixture as Record<string, unknown> | undefined;
    if (!teams || !fixture) continue;
    const home = num((teams.home as Record<string, unknown> | undefined)?.id);
    const away = num((teams.away as Record<string, unknown> | undefined)?.id);
    const fid = num(fixture.id);
    if (home == null || away == null || fid == null) continue;
    if (home === homeApiId && away === awayApiId) matches.push(fid);
  }
  if (matches.length === 1) return { fixtureId: matches[0]! };
  if (matches.length === 0) return "none";
  return "ambiguous";
}

const CUP_ROUND_MAP: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/^final$/i, "Finale"],
  [/3rd\s*place/i, "3e place"],
  [/semi[-\s]?finals?/i, "Demies"],
  [/quarter[-\s]?finals?/i, "Quarts"],
  [/round\s+of\s+64/i, "32èmes"],
  [/round\s+of\s+32/i, "16èmes"],
  [/round\s+of\s+16/i, "8èmes"],
  [/round\s+of\s+8/i, "Quarts"],
  [/round\s+of\s+4/i, "Demies"],
  [/league\s+phase/i, "Phase de ligue"],
  [/group\s+stage\s*[-–]\s*(\d+)/i, (m: RegExpMatchArray) => `GS-${m[1]}`],
  [/preliminary\s+stage/i, "Préliminaires"],
  [/play[-\s]?offs?/i, "Playoffs"],
  [/qualifying\s*[-–]?\s*(\d+)/i, (m: RegExpMatchArray) => `Q${m[1]}`],
];

export function roundShortFromFixtureRow(
  row: Record<string, unknown>,
): string | null {
  const league = row.league as Record<string, unknown> | undefined;
  const raw = typeof league?.round === "string" ? league.round.trim() : "";
  if (raw === "") return null;
  const seasonNum = /Regular\s+Season\s*[-–]\s*(\d+)/i.exec(raw);
  if (seasonNum?.[1]) return `J${seasonNum[1]}`;
  const tailNum = /[-–]\s*(\d+)\s*$/i.exec(raw);
  if (tailNum?.[1] && /season|jour|matchday|gameweek/i.test(raw))
    return `J${tailNum[1]}`;
  for (const [pattern, label] of CUP_ROUND_MAP) {
    const m = pattern.exec(raw);
    if (m) return typeof label === "function" ? label(m) : label;
  }
  const max = 20;
  if (raw.length > max) return `${raw.slice(0, max - 1)}…`;
  return raw;
}

export function patchMatchFromFixtureRow(
  row: Record<string, unknown>,
): Database["public"]["Tables"]["matches"]["Update"] {
  const goals = row.goals as Record<string, unknown> | undefined;
  const homeScore = num(goals?.home) ?? 0;
  const awayScore = num(goals?.away) ?? 0;
  const fixture = row.fixture as Record<string, unknown> | undefined;
  const status = fixture?.status as Record<string, unknown> | undefined;
  const short = typeof status?.short === "string" ? status.short : "";
  const elapsed = num(status?.elapsed);
  const mappedStatus = mapApiFootballFixtureStatusShort(short);
  let matchStatus = mappedStatus;
  if ((homeScore > 0 || awayScore > 0) && matchStatus === "upcoming")
    matchStatus = "first_half";
  const roundShort = roundShortFromFixtureRow(row);
  return {
    home_score: homeScore,
    away_score: awayScore,
    status: matchStatus,
    match_minute: elapsed != null ? Math.min(120, Math.max(0, elapsed)) : null,
    ...(roundShort != null ? { round_short: roundShort } : {}),
  };
}

export function fixtureApiStatusShortFromRow(
  row: Record<string, unknown>,
): string {
  const fixture = row.fixture as Record<string, unknown> | undefined;
  const status = fixture?.status as Record<string, unknown> | undefined;
  const s = status?.short;
  return typeof s === "string" ? s.toUpperCase().trim() : "";
}

/** Types de stats trackés (filtre côté upsert + UI). */
const TRACKED_STAT_TYPES = new Set([
  "Ball Possession",
  "Shots on Goal",
  "Total Shots",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Offsides",
  "Goalkeeper Saves",
  "Total passes",
  "Passes accurate",
  "Passes %",
]);

// ── Fonctions atomiques publiques ─────────────────────────────────────────────

/**
 * ⚡ Sync rapide des événements timeline (buts, cartons, remplacements).
 * 1 seul appel API — conçu pour être appelé à chaque tick du monitor (≈ 1 min).
 */
export async function syncMatchEvents(
  matchId: string,
): Promise<SyncEventsResult> {
  const admin = createAdminClient();
  const ctx = await resolveMatchContext(admin, matchId);
  if (!ctx) {
    return {
      matchId,
      fixtureId: null,
      skippedReason: "no_context",
      timelineUpserted: 0,
    };
  }

  const eventsPayload = await fetchApiFootball<unknown>("fixtures/events", {
    fixture: String(ctx.fixtureId),
  });

  const events = extractFixtureList(eventsPayload);
  const inserts: Database["public"]["Tables"]["match_timeline_events"]["Insert"][] =
    [];
  events.forEach((ev, index) => {
    const mapped = mapEventToTimeline(
      matchId,
      ctx.fixtureId,
      index,
      ev as Record<string, unknown>,
      ctx.homeApiId,
      ctx.awayApiId,
    );
    if (mapped) inserts.push(mapped);
  });

  let timelineUpserted = 0;
  if (inserts.length > 0) {
    const tlChunk = 40;
    for (let i = 0; i < inserts.length; i += tlChunk) {
      const slice = inserts.slice(i, i + tlChunk);
      const { error } = await admin
        .from("match_timeline_events")
        .upsert(slice, {
          onConflict: "api_football_event_id",
          ignoreDuplicates: false,
        });
      if (error) throw new Error(`timeline upsert: ${error.message}`);
      timelineUpserted += slice.length;
    }
  }

  await admin
    .from("matches")
    .update({ last_events_sync_at: new Date().toISOString() })
    .eq("id", matchId);

  let apiMarketSync: SyncEventsResult["apiMarketSync"];
  try {
    apiMarketSync = await applyApiFootballSignalsToMarkets(
      admin,
      matchId,
      events,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[api-football-market] match ${matchId}:`, msg);
    apiMarketSync = {
      var_goal_opened: false,
      var_goal_resolved: false,
      penalty_check_opened: false,
      penalty_check_resolved: false,
      errors: [msg],
    };
  }

  console.log(
    `⚡ Fast-Sync Events: Match ${matchId} — ${events.length} events (${timelineUpserted} upserted)`,
  );

  return { matchId, fixtureId: ctx.fixtureId, timelineUpserted, apiMarketSync };
}

/**
 * Un seul appel `fixtures/events` — pour `/api/verify-event` ou scripts.
 * Retourne `null` si le match n'a pas de contexte API-Football.
 */
export async function fetchFixtureEventsRaw(
  matchId: string,
): Promise<{ fixtureId: number; events: unknown[] } | null> {
  const admin = createAdminClient();
  const ctx = await resolveMatchContext(admin, matchId);
  if (!ctx) return null;
  const eventsPayload = await fetchApiFootball<unknown>("fixtures/events", {
    fixture: String(ctx.fixtureId),
  });
  const events = extractFixtureList(eventsPayload);
  return { fixtureId: ctx.fixtureId, events };
}

/**
 * 📊 Sync des statistiques de match (possession, tirs, corners…).
 * 1 seul appel API — appelé au heartbeat de 5 min.
 */
export async function syncMatchStatistics(
  matchId: string,
): Promise<SyncStatsResult> {
  const admin = createAdminClient();
  const ctx = await resolveMatchContext(admin, matchId);
  if (!ctx) {
    return {
      matchId,
      fixtureId: null,
      skippedReason: "no_context",
      statisticsUpserted: 0,
    };
  }

  const payload = await fetchApiFootball<unknown>("fixtures/statistics", {
    fixture: String(ctx.fixtureId),
  });

  const blocks = extractFixtureList(payload);
  const upserts: Database["public"]["Tables"]["match_statistics"]["Insert"][] =
    [];

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const teamObj = b.team as Record<string, unknown> | undefined;
    const teamApiId = num(teamObj?.id);
    if (teamApiId == null) continue;

    let teamUuid: string | null = null;
    if (teamApiId === ctx.homeApiId) teamUuid = ctx.homeTeamId;
    else if (teamApiId === ctx.awayApiId) teamUuid = ctx.awayTeamId;
    if (!teamUuid) continue;

    const statistics = b.statistics as unknown[] | undefined;
    if (!Array.isArray(statistics)) continue;

    for (const stat of statistics) {
      const s = stat as Record<string, unknown>;
      const type = typeof s.type === "string" ? s.type.trim() : "";
      if (!type || !TRACKED_STAT_TYPES.has(type)) continue;
      const rawVal = s.value;
      const value = rawVal != null && rawVal !== "null" ? String(rawVal) : null;
      upserts.push({ match_id: matchId, team_id: teamUuid, type, value });
    }
  }

  if (upserts.length > 0) {
    const { error } = await admin
      .from("match_statistics")
      .upsert(upserts, { onConflict: "match_id,team_id,type" });
    if (error) throw new Error(`match_statistics upsert: ${error.message}`);
  }

  await admin
    .from("matches")
    .update({ last_stats_sync_at: new Date().toISOString() })
    .eq("id", matchId);

  console.log(
    `📊 Heartbeat Stats: Match ${matchId} — ${upserts.length} stats upserted`,
  );

  return {
    matchId,
    fixtureId: ctx.fixtureId,
    statisticsUpserted: upserts.length,
  };
}

/**
 * Sync des compositions (feuille de match).
 * 1 seul appel API — appelé une fois avant/au début du match.
 */
export async function syncMatchLineups(
  matchId: string,
): Promise<SyncLineupsResult> {
  const admin = createAdminClient();
  const ctx = await resolveMatchContext(admin, matchId);
  if (!ctx) {
    return {
      matchId,
      fixtureId: null,
      skippedReason: "no_context",
      lineupsInserted: 0,
    };
  }

  const lineupsPayload = await fetchApiFootball<unknown>("fixtures/lineups", {
    fixture: String(ctx.fixtureId),
  });

  const lineupRowsUnknown = extractFixtureList(lineupsPayload);
  const lineupInserts: Database["public"]["Tables"]["lineups"]["Insert"][] = [];

  for (const block of lineupRowsUnknown) {
    const b = block as Record<string, unknown>;
    const teamObj = b.team as Record<string, unknown> | undefined;
    const teamApi = num(teamObj?.id);
    if (teamApi == null) continue;

    let team_side: "home" | "away" | null = null;
    let teamUuid: string | null = null;
    let teamName: string | null = null;
    if (teamApi === ctx.homeApiId) {
      team_side = "home";
      teamUuid = ctx.homeTeamId;
      teamName = ctx.homeTeamName;
    } else if (teamApi === ctx.awayApiId) {
      team_side = "away";
      teamUuid = ctx.awayTeamId;
      teamName = ctx.awayTeamName;
    }
    if (team_side == null || teamUuid == null || teamName == null) continue;

    const startXI = b.startXI as unknown[] | undefined;
    const subs = b.substitutes as unknown[] | undefined;

    const pushPlayers = async (
      arr: unknown[] | undefined,
      status: "starter" | "bench",
    ) => {
      if (!Array.isArray(arr)) return;
      for (const cell of arr) {
        const c = cell as Record<string, unknown>;
        const pl = c.player as Record<string, unknown> | undefined;
        const name = typeof pl?.name === "string" ? pl.name.trim() : "";
        if (name === "") continue;
        const apiPid = num(pl?.id) ?? 0;
        const pos = mapLineupPositionApi(
          typeof pl?.pos === "string" ? pl.pos : null,
        );
        const numRaw = pl?.number;
        const shirt_number =
          numRaw != null && String(numRaw).trim() !== ""
            ? String(numRaw).trim().slice(0, 4)
            : null;
        const gridRaw = pl?.grid;
        const grid_position =
          typeof gridRaw === "string" && gridRaw.trim() !== ""
            ? gridRaw.trim()
            : null;
        let player_id: string | null = null;
        try {
          player_id = await resolvePlayerOrGhost(admin, {
            teamId: teamUuid!,
            teamName: teamName!,
            apiPlayerName: name,
            apiPlayerId: apiPid,
            position: pos,
            fixtureId: ctx.fixtureId,
          });
        } catch {
          player_id = null;
        }
        lineupInserts.push({
          match_id: matchId,
          player_name: name,
          team_side,
          position: pos,
          status,
          player_id,
          shirt_number,
          grid_position,
        });
      }
    };

    await pushPlayers(startXI, "starter");
    await pushPlayers(subs, "bench");
  }

  const { error: delErr } = await admin
    .from("lineups")
    .delete()
    .eq("match_id", matchId);
  if (delErr) throw new Error(`lineups delete: ${delErr.message}`);

  let lineupsInserted = 0;
  if (lineupInserts.length > 0) {
    const chunkSz = 50;
    for (let i = 0; i < lineupInserts.length; i += chunkSz) {
      const { error } = await admin
        .from("lineups")
        .insert(lineupInserts.slice(i, i + chunkSz));
      if (error) throw new Error(`lineups insert: ${error.message}`);
      lineupsInserted += lineupInserts.slice(i, i + chunkSz).length;
    }
  }

  await admin
    .from("matches")
    .update({ has_lineups: lineupsInserted > 0 })
    .eq("id", matchId);

  return { matchId, fixtureId: ctx.fixtureId, lineupsInserted };
}

// ── Orchestrateur FT ──────────────────────────────────────────────────────────

/**
 * Sync complet d'un match (fixture + compos + events + stats) en parallèle.
 * À utiliser uniquement pour la sync finale (FT) ou la sync admin manuelle.
 * Pour les matchs en cours, préférer les fonctions atomiques.
 *
 * @param options.leadingDelayMs délai avant le 1er appel (back-compat sportsdb-sync).
 */
export async function syncApiFootballMatch(
  matchId: string,
  options?: { leadingDelayMs?: number },
): Promise<SyncApiFootballMatchResult> {
  const lead = options?.leadingDelayMs ?? 0;
  if (lead > 0) await delay(lead);

  const admin = createAdminClient();

  const { data: match, error: mErr } = await admin
    .from("matches")
    .select(
      "id, team_home, team_away, start_time, status, home_score, away_score, match_minute, api_football_id, home_team_id, away_team_id",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (mErr) throw new Error(`syncApiFootballMatch match: ${mErr.message}`);
  if (!match)
    return {
      matchId,
      skippedReason: "match_not_found",
      fixtureId: null,
      lineupsInserted: 0,
      timelineUpserted: 0,
      statisticsUpserted: 0,
      matchUpdated: false,
    };
  if (!match.home_team_id || !match.away_team_id)
    return {
      matchId,
      skippedReason: "missing_home_or_away_team_id",
      fixtureId: match.api_football_id,
      lineupsInserted: 0,
      timelineUpserted: 0,
      statisticsUpserted: 0,
      matchUpdated: false,
    };

  const teamMap = await fetchTeamsApiByUuid(admin, [
    match.home_team_id,
    match.away_team_id,
  ]);
  const homeTeam = teamMap.get(match.home_team_id);
  const awayTeam = teamMap.get(match.away_team_id);
  const homeApiId = homeTeam?.api_football_id ?? null;
  const awayApiId = awayTeam?.api_football_id ?? null;

  if (homeApiId == null || awayApiId == null)
    return {
      matchId,
      skippedReason: "missing_api_football_team_id",
      fixtureId: match.api_football_id,
      lineupsInserted: 0,
      timelineUpserted: 0,
      statisticsUpserted: 0,
      matchUpdated: false,
    };

  let fixtureId = match.api_football_id;

  // Résolution fixture par date si api_football_id manquant
  if (fixtureId == null) {
    const date = matchCalendarDateFromStartTime(match.start_time ?? "");
    const season = String(getApiFootballSeasonYear());
    const fixturesParams = { team: String(homeApiId), date, season };
    const debugUrl = new URL(`${API_FOOTBALL_BASE_URL}/fixtures`);
    for (const [k, v] of Object.entries(fixturesParams))
      debugUrl.searchParams.set(k, v);
    console.log("[syncApiFootballMatch] GET /fixtures (résolution)", {
      homeApiId,
      awayApiId,
      date,
      season,
      url: debugUrl.toString(),
    });

    const payload = await fetchApiFootball<unknown>("fixtures", fixturesParams);
    const rows = extractFixtureList(payload);
    const picked = pickFixtureIdStrict(rows, homeApiId, awayApiId);
    if (picked === "none")
      return {
        matchId,
        skippedReason: "fixture_not_found",
        fixtureId: null,
        lineupsInserted: 0,
        timelineUpserted: 0,
        statisticsUpserted: 0,
        matchUpdated: false,
      };
    if (picked === "ambiguous")
      return {
        matchId,
        skippedReason: "fixture_ambiguous",
        fixtureId: null,
        lineupsInserted: 0,
        timelineUpserted: 0,
        statisticsUpserted: 0,
        matchUpdated: false,
      };
    fixtureId = picked.fixtureId;

    const row = rows.find((item) => {
      const r = item as Record<string, unknown>;
      const f = r.fixture as Record<string, unknown> | undefined;
      return num(f?.id) === fixtureId;
    }) as Record<string, unknown> | undefined;

    await delay(ORCHESTRATOR_CALL_DELAY_MS);
    const { error: up0 } = await admin
      .from("matches")
      .update({
        api_football_id: fixtureId,
        ...(row ? patchMatchFromFixtureRow(row) : {}),
      })
      .eq("id", matchId);
    if (up0) throw new Error(`matches update fixture resolve: ${up0.message}`);
  } else {
    // Mise à jour score/statut depuis la fixture
    await delay(ORCHESTRATOR_CALL_DELAY_MS);
    const payload = await fetchApiFootball<unknown>("fixtures", {
      id: String(fixtureId),
    });
    const rows = extractFixtureList(payload);
    const row = (rows[0] ?? null) as Record<string, unknown> | null;
    if (row) {
      const { error: up1 } = await admin
        .from("matches")
        .update(patchMatchFromFixtureRow(row))
        .eq("id", matchId);
      if (up1)
        throw new Error(`matches update from fixture id: ${up1.message}`);
    }
  }

  // Sync parallèle : compos + events + stats (api_football_id est maintenant en DB)
  const [lineupsResult, eventsResult, statsResult] = await Promise.all([
    syncMatchLineups(matchId).catch((err) => {
      console.warn(
        `[syncApiFootballMatch] lineups: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        matchId,
        fixtureId,
        skippedReason: "error",
        lineupsInserted: 0,
      } as SyncLineupsResult;
    }),
    syncMatchEvents(matchId).catch((err) => {
      console.warn(
        `[syncApiFootballMatch] events: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        matchId,
        fixtureId,
        skippedReason: "error",
        timelineUpserted: 0,
      } as SyncEventsResult;
    }),
    syncMatchStatistics(matchId).catch((err) => {
      console.warn(
        `[syncApiFootballMatch] stats: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        matchId,
        fixtureId,
        skippedReason: "error",
        statisticsUpserted: 0,
      } as SyncStatsResult;
    }),
  ]);

  const { data: afterMatch } = await admin
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();
  if (afterMatch?.status === "finished") {
    const { error: pronoResErr } = await admin.rpc("resolve_match_pronos", {
      p_match_id: matchId,
    });
    if (pronoResErr) {
      console.warn(
        `[syncApiFootballMatch] resolve_match_pronos: ${pronoResErr.message}`,
      );
    }
  }

  return {
    matchId,
    fixtureId,
    lineupsInserted: lineupsResult.lineupsInserted,
    timelineUpserted: eventsResult.timelineUpserted,
    statisticsUpserted: statsResult.statisticsUpserted,
    matchUpdated: true,
  };
}
