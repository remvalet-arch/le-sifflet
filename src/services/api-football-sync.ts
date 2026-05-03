/**
 * Sync live match : API-Football v3 (fixtures, lineups, events) → `matches`, `lineups`, `match_timeline_events`.
 * Throttle 6,5 s entre appels HTTP pour rester sous 10 req/min (plan gratuit).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  API_FOOTBALL_BASE_URL,
  fetchApiFootball,
  getApiFootballSeasonYear,
} from "@/lib/api-football-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MatchStatus, TimelineEventType } from "@/types/database";

type Admin = SupabaseClient<Database>;

const API_THROTTLE_MS = 6500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Limite de matchs traités par exécution `syncLiveMatches` (évite timeout cron / quota). */
export const SYNC_LIVE_MAX_MATCHES_PER_RUN = 3;

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
  matchUpdated: boolean;
};

type TeamApiRow = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "name" | "api_football_id" | "thesportsdb_team_id"
>;

/**
 * Date calendrier du match (YYYY-MM-DD) pour `/fixtures?date=…` :
 * on lit la partie date **telle qu’au début du littéral** (ISO / Postgres), sans passer par `Date` → `toISOString()`
 * (évite un décalage de jour UTC vs la date stockée).
 */
function matchCalendarDateFromStartTime(startTime: string): string {
  const s = startTime.trim();
  const head = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (head?.[1]) {
    const [, ymd] = head;
    const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
    if (
      y >= 1900 &&
      y <= 2100 &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= 31
    ) {
      return ymd;
    }
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
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

/** Statut court API-Football → `MatchStatus` DB. */
export function mapApiFootballFixtureStatusShort(short: string | undefined | null): MatchStatus {
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function fetchTeamsApiByUuid(
  admin: Admin,
  teamUuids: string[],
): Promise<Map<string, TeamApiRow>> {
  const unique = [...new Set(teamUuids.filter(Boolean))];
  const map = new Map<string, TeamApiRow>();
  if (unique.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("teams")
      .select("id, name, api_football_id, thesportsdb_team_id")
      .in("id", slice);
    if (error) throw new Error(`teams by id: ${error.message}`);
    for (const row of data ?? []) {
      map.set(row.id, row);
    }
  }
  return map;
}

/**
 * Résout ou crée un joueur « fantôme » lié à `team_id`.
 */
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
  const { data: existing } = await admin.from("players").select("id").eq("thesportsdb_id", ghostId).maybeSingle();
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
  const assistName = typeof assist?.name === "string" && assist.name.trim() !== "" ? assist.name.trim() : null;

  let details: string | null = null;
  if (assistName && typeStr === "subst") {
    details = JSON.stringify({ assist: assistName, detail: detailStr });
  } else if (detailStr && event_type === "info") {
    details = `${String(raw.type ?? "")}: ${detailStr}`;
  } else if (assistName) {
    details = JSON.stringify({ assist: assistName, detail: detailStr });
  }

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
  if ((homeScore > 0 || awayScore > 0) && matchStatus === "upcoming") {
    matchStatus = "first_half";
  }
  const patch: Database["public"]["Tables"]["matches"]["Update"] = {
    home_score: homeScore,
    away_score: awayScore,
    status: matchStatus,
    match_minute: elapsed != null ? Math.min(120, Math.max(0, elapsed)) : null,
  };
  return patch;
}

/** Statut court brut API-Football (`fixture.status.short`) depuis une ligne `response[]` de `/fixtures`. */
export function fixtureApiStatusShortFromRow(row: Record<string, unknown>): string {
  const fixture = row.fixture as Record<string, unknown> | undefined;
  const status = fixture?.status as Record<string, unknown> | undefined;
  const s = status?.short;
  return typeof s === "string" ? s.toUpperCase().trim() : "";
}

type ApiCallContext = { afterFirst: boolean };

async function apiFootballFetch<T>(
  ctx: ApiCallContext,
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  if (ctx.afterFirst) await delay(API_THROTTLE_MS);
  ctx.afterFirst = true;
  return fetchApiFootball<T>(endpoint, params);
}

/**
 * Sync complet d’un match via API-Football (fixture, compos, événements).
 * @param options.leadingDelayMs délai avant le 1er appel (enchaînement multi-matchs / cron).
 */
export async function syncApiFootballMatch(
  matchId: string,
  options?: { leadingDelayMs?: number },
): Promise<SyncApiFootballMatchResult> {
  const lead = options?.leadingDelayMs ?? 0;
  if (lead > 0) await delay(lead);

  const admin = createAdminClient();
  const apiCtx: ApiCallContext = { afterFirst: false };

  const { data: match, error: mErr } = await admin
    .from("matches")
    .select(
      "id, team_home, team_away, start_time, status, home_score, away_score, match_minute, api_football_id, home_team_id, away_team_id",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (mErr) throw new Error(`syncApiFootballMatch match: ${mErr.message}`);
  if (!match) {
    return {
      matchId,
      skippedReason: "match_not_found",
      fixtureId: null,
      lineupsInserted: 0,
      timelineUpserted: 0,
      matchUpdated: false,
    };
  }

  if (!match.home_team_id || !match.away_team_id) {
    return {
      matchId,
      skippedReason: "missing_home_or_away_team_id",
      fixtureId: match.api_football_id,
      lineupsInserted: 0,
      timelineUpserted: 0,
      matchUpdated: false,
    };
  }

  const teamMap = await fetchTeamsApiByUuid(admin, [match.home_team_id, match.away_team_id]);
  const homeTeam = teamMap.get(match.home_team_id);
  const awayTeam = teamMap.get(match.away_team_id);
  const homeApiId = homeTeam?.api_football_id ?? null;
  const awayApiId = awayTeam?.api_football_id ?? null;

  if (homeApiId == null || awayApiId == null) {
    return {
      matchId,
      skippedReason: "missing_api_football_team_id",
      fixtureId: match.api_football_id,
      lineupsInserted: 0,
      timelineUpserted: 0,
      matchUpdated: false,
    };
  }

  let fixtureId = match.api_football_id;

  if (fixtureId == null) {
    const date = matchCalendarDateFromStartTime(match.start_time ?? "");
    // Saison API-Football = année de début (2025 pour 2025/2026), pas l’année civile du KO
    const season = String(getApiFootballSeasonYear());
    const fixturesParams = { team: String(homeApiId), date, season };
    const debugFixturesUrl = new URL(`${API_FOOTBALL_BASE_URL}/fixtures`);
    for (const [k, v] of Object.entries(fixturesParams)) {
      debugFixturesUrl.searchParams.set(k, v);
    }
    console.log("[syncApiFootballMatch] GET /fixtures (résolution)", {
      homeTeamName: homeTeam?.name ?? "(inconnu)",
      homeApiFootballId: homeApiId,
      awayApiFootballId: awayApiId,
      matchStartTimeRaw: match.start_time,
      dateUsedForSearch: date,
      seasonUsedForSearch: season,
      requestUrl: debugFixturesUrl.toString(),
    });
    const payload = await apiFootballFetch<unknown>(apiCtx, "fixtures", fixturesParams);
    const rows = extractFixtureList(payload);
    const picked = pickFixtureIdStrict(rows, homeApiId, awayApiId);
    if (picked === "none") {
      return {
        matchId,
        skippedReason: "fixture_not_found",
        fixtureId: null,
        lineupsInserted: 0,
        timelineUpserted: 0,
        matchUpdated: false,
      };
    }
    if (picked === "ambiguous") {
      return {
        matchId,
        skippedReason: "fixture_ambiguous",
        fixtureId: null,
        lineupsInserted: 0,
        timelineUpserted: 0,
        matchUpdated: false,
      };
    }
    fixtureId = picked.fixtureId;

    const row = rows.find((item) => {
      const r = item as Record<string, unknown>;
      const f = r.fixture as Record<string, unknown> | undefined;
      return num(f?.id) === fixtureId;
    }) as Record<string, unknown> | undefined;

    const patch: Database["public"]["Tables"]["matches"]["Update"] = {
      api_football_id: fixtureId,
      ...(row ? patchMatchFromFixtureRow(row) : {}),
    };
    const { error: up0 } = await admin.from("matches").update(patch).eq("id", matchId);
    if (up0) throw new Error(`matches update fixture resolve: ${up0.message}`);
  } else {
    const payload = await apiFootballFetch<unknown>(apiCtx, "fixtures", { id: String(fixtureId) });
    const rows = extractFixtureList(payload);
    const row = (rows[0] ?? null) as Record<string, unknown> | null;
    if (row) {
      const patch = patchMatchFromFixtureRow(row);
      const { error: up1 } = await admin.from("matches").update(patch).eq("id", matchId);
      if (up1) throw new Error(`matches update from fixture id: ${up1.message}`);
    }
  }

  const lineupsPayload = await apiFootballFetch<unknown>(apiCtx, "fixtures/lineups", {
    fixture: String(fixtureId),
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
    if (teamApi === homeApiId) {
      team_side = "home";
      teamUuid = match.home_team_id;
      teamName = homeTeam?.name ?? match.team_home;
    } else if (teamApi === awayApiId) {
      team_side = "away";
      teamUuid = match.away_team_id;
      teamName = awayTeam?.name ?? match.team_away;
    }
    if (team_side == null || teamUuid == null || teamName == null) continue;

    const startXI = b.startXI as unknown[] | undefined;
    const subs = b.substitutes as unknown[] | undefined;

    const pushPlayers = async (arr: unknown[] | undefined, status: "starter" | "bench") => {
      if (!Array.isArray(arr)) return;
      for (const cell of arr) {
        const c = cell as Record<string, unknown>;
        const pl = c.player as Record<string, unknown> | undefined;
        const name = typeof pl?.name === "string" ? pl.name.trim() : "";
        if (name === "") continue;
        const apiPid = num(pl?.id) ?? 0;
        const pos = mapLineupPositionApi(typeof pl?.pos === "string" ? pl.pos : null);
        let player_id: string | null = null;
        try {
          player_id = await resolvePlayerOrGhost(admin, {
            teamId: teamUuid,
            teamName,
            apiPlayerName: name,
            apiPlayerId: apiPid,
            position: pos,
            fixtureId,
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
        });
      }
    };

    await pushPlayers(startXI, "starter");
    await pushPlayers(subs, "bench");
  }

  const { error: delLuErr } = await admin.from("lineups").delete().eq("match_id", matchId);
  if (delLuErr) throw new Error(`lineups delete: ${delLuErr.message}`);

  let lineupsInserted = 0;
  if (lineupInserts.length > 0) {
    const chunk = 50;
    for (let i = 0; i < lineupInserts.length; i += chunk) {
      const slice = lineupInserts.slice(i, i + chunk);
      const { error: insLuErr } = await admin.from("lineups").insert(slice);
      if (insLuErr) throw new Error(`lineups insert: ${insLuErr.message}`);
      lineupsInserted += slice.length;
    }
  }

  // GET /fixtures/events?fixture=<id> — même contrat que fetchApiFootball('fixtures/events', { fixture })
  const eventsPayload = await apiFootballFetch<unknown>(apiCtx, "fixtures/events", {
    fixture: String(fixtureId),
  });

  const events = extractFixtureList(eventsPayload);
  const timelineInserts: Database["public"]["Tables"]["match_timeline_events"]["Insert"][] = [];
  events.forEach((ev, index) => {
    const mapped = mapEventToTimeline(
      matchId,
      fixtureId,
      index,
      ev as Record<string, unknown>,
      homeApiId,
      awayApiId,
    );
    if (mapped) timelineInserts.push(mapped);
  });

  let timelineUpserted = 0;
  if (timelineInserts.length > 0) {
    const tlChunk = 40;
    for (let i = 0; i < timelineInserts.length; i += tlChunk) {
      const slice = timelineInserts.slice(i, i + tlChunk);
      const { error: tlErr } = await admin
        .from("match_timeline_events")
        .upsert(slice, { onConflict: "api_football_event_id", ignoreDuplicates: false });
      if (tlErr) throw new Error(`match_timeline_events upsert: ${tlErr.message}`);
      timelineUpserted += slice.length;
    }
  }

  console.log(`Synced ${events.length} events for match ${matchId}`);

  return {
    matchId,
    fixtureId,
    lineupsInserted,
    timelineUpserted,
    matchUpdated: true,
  };
}
