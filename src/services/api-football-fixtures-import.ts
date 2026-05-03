/**
 * Import calendrier API-Football (Top 5) → `competitions`, `matches` (upsert sur `api_football_id`).
 * Prérequis : `teams.api_football_id` renseigné pour résoudre domicile / extérieur.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchApiFootball, getApiFootballSeasonYear } from "@/lib/api-football-client";
import { TOP_LEAGUES } from "@/lib/constants/top-leagues";
import { num, patchMatchFromFixtureRow } from "@/services/api-football-sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

const DEFAULT_THROTTLE_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttleMs(): number {
  const raw = process.env.API_FOOTBALL_TOP5_THROTTLE_MS?.trim();
  if (raw !== undefined && raw !== "") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 10_000) return n;
  }
  return DEFAULT_THROTTLE_MS;
}

function extractFixtureList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const r = (payload as Record<string, unknown>).response;
  return Array.isArray(r) ? r : [];
}

/** `thesportsdb_league_id` synthétique stable (contrainte UNIQUE existante). */
function syntheticTsdbLeagueId(apiLeagueId: number): string {
  return `api-football-league-${String(apiLeagueId)}`;
}

async function ensureCompetitionForApiLeague(
  admin: Admin,
  apiLeagueId: number,
  name: string,
  badgeUrl: string | null,
): Promise<string> {
  const { data: byApi, error: selErr } = await admin
    .from("competitions")
    .select("id")
    .eq("api_football_league_id", apiLeagueId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (byApi?.id) {
    const { error: upErr } = await admin
      .from("competitions")
      .update({ name, badge_url: badgeUrl })
      .eq("id", byApi.id);
    if (upErr) throw new Error(upErr.message);
    return byApi.id;
  }

  const synthetic = syntheticTsdbLeagueId(apiLeagueId);
  const { data, error } = await admin
    .from("competitions")
    .upsert(
      {
        thesportsdb_league_id: synthetic,
        name,
        badge_url: badgeUrl,
        api_football_league_id: apiLeagueId,
      },
      { onConflict: "thesportsdb_league_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "competitions upsert sans retour");
  return data.id;
}

async function fetchTeamsByApiIds(
  admin: Admin,
  apiIds: number[],
): Promise<Map<number, { id: string; logo_url: string | null; color_primary: string | null }>> {
  const map = new Map<number, { id: string; logo_url: string | null; color_primary: string | null }>();
  const unique = [...new Set(apiIds.filter((n) => n > 0))];
  if (unique.length === 0) return map;
  const chunk = 100;
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk);
    const { data, error } = await admin
      .from("teams")
      .select("id, api_football_id, logo_url, color_primary")
      .in("api_football_id", slice);
    if (error) throw new Error(`teams by api_football_id: ${error.message}`);
    for (const row of data ?? []) {
      if (row.api_football_id != null) {
        map.set(row.api_football_id, {
          id: row.id,
          logo_url: row.logo_url,
          color_primary: row.color_primary,
        });
      }
    }
  }
  return map;
}

export type SyncApiFootballFixturesForDateResult = {
  date: string;
  season: string;
  leaguesProcessed: number;
  fixturesFetched: number;
  matchesUpserted: number;
  skippedNoTeams: number;
  errors: string[];
};

/**
 * Pour chaque ligue Top 5 : `GET /fixtures?league=&season=&date=` puis upsert `matches` (`api_football_id`).
 * @param dateYmd `YYYY-MM-DD` (jour calendrier API, en pratique aligné UTC côté API pour la journée).
 */
export async function syncApiFootballFixturesForDate(dateYmd: string): Promise<SyncApiFootballFixturesForDateResult> {
  const admin = createAdminClient();
  const season = String(getApiFootballSeasonYear());
  const wait = throttleMs();
  const result: SyncApiFootballFixturesForDateResult = {
    date: dateYmd,
    season,
    leaguesProcessed: 0,
    fixturesFetched: 0,
    matchesUpserted: 0,
    skippedNoTeams: 0,
    errors: [],
  };

  let first = true;
  for (const league of TOP_LEAGUES) {
    if (!first) await delay(wait);
    first = false;

    let payload: unknown;
    try {
      payload = await fetchApiFootball<unknown>("fixtures", {
        league: String(league.apiFootballLeagueId),
        season,
        date: dateYmd,
      });
    } catch (e) {
      result.errors.push(
        `league ${String(league.apiFootballLeagueId)}: ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }

    const list = extractFixtureList(payload);
    result.leaguesProcessed += 1;
    result.fixturesFetched += list.length;

    if (list.length === 0) {
      continue;
    }

    const apiTeamIds: number[] = [];
    for (const item of list) {
      const row = item as Record<string, unknown>;
      const teams = row.teams as Record<string, unknown> | undefined;
      const h = num((teams?.home as Record<string, unknown> | undefined)?.id);
      const a = num((teams?.away as Record<string, unknown> | undefined)?.id);
      if (h != null) apiTeamIds.push(h);
      if (a != null) apiTeamIds.push(a);
    }
    const teamMap = await fetchTeamsByApiIds(admin, apiTeamIds);

    const firstRow = list[0] as Record<string, unknown> | undefined;
    const leagueObj = firstRow?.league as Record<string, unknown> | undefined;
    const leagueName =
      typeof leagueObj?.name === "string" && leagueObj.name.trim() !== ""
        ? leagueObj.name.trim()
        : league.label;
    const leagueLogo =
      typeof leagueObj?.logo === "string" && leagueObj.logo.trim() !== "" ? leagueObj.logo.trim() : null;

    let competitionId: string;
    try {
      competitionId = await ensureCompetitionForApiLeague(admin, league.apiFootballLeagueId, leagueName, leagueLogo);
    } catch (e) {
      result.errors.push(
        `competition L${String(league.apiFootballLeagueId)}: ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }

    for (const item of list) {
      const row = item as Record<string, unknown>;
      const fixture = row.fixture as Record<string, unknown> | undefined;
      const fid = num(fixture?.id);
      if (fid == null) continue;

      const teams = row.teams as Record<string, unknown> | undefined;
      const homeApi = num((teams?.home as Record<string, unknown> | undefined)?.id);
      const awayApi = num((teams?.away as Record<string, unknown> | undefined)?.id);
      const homeName =
        typeof (teams?.home as Record<string, unknown> | undefined)?.name === "string"
          ? String((teams?.home as Record<string, unknown>).name).trim()
          : "";
      const awayName =
        typeof (teams?.away as Record<string, unknown> | undefined)?.name === "string"
          ? String((teams?.away as Record<string, unknown>).name).trim()
          : "";

      if (homeApi == null || awayApi == null || homeName === "" || awayName === "") {
        result.skippedNoTeams += 1;
        continue;
      }

      const homeRow = teamMap.get(homeApi);
      const awayRow = teamMap.get(awayApi);
      if (!homeRow || !awayRow) {
        result.skippedNoTeams += 1;
        continue;
      }

      const homeLogo =
        typeof (teams?.home as Record<string, unknown> | undefined)?.logo === "string"
          ? String((teams?.home as Record<string, unknown>).logo).trim()
          : "";
      const awayLogo =
        typeof (teams?.away as Record<string, unknown> | undefined)?.logo === "string"
          ? String((teams?.away as Record<string, unknown>).logo).trim()
          : "";

      const ts = fixture?.timestamp;
      let start_time: string;
      if (typeof ts === "number" && !Number.isNaN(ts)) {
        start_time = new Date(ts * 1000).toISOString();
      } else if (typeof ts === "string" && ts.trim() !== "") {
        const n = parseInt(ts, 10);
        start_time = !Number.isNaN(n) ? new Date(n * 1000).toISOString() : new Date().toISOString();
      } else {
        const dateStr = typeof fixture?.date === "string" ? fixture.date : dateYmd;
        start_time = new Date(`${dateStr}T12:00:00.000Z`).toISOString();
      }

      const patch = patchMatchFromFixtureRow(row);
      const syntheticEventId = `apifb-fxt-${String(fid)}`;

      const insert: Database["public"]["Tables"]["matches"]["Insert"] = {
        thesportsdb_event_id: syntheticEventId,
        team_home: homeName,
        team_away: awayName,
        start_time,
        status: patch.status ?? "upcoming",
        home_score: patch.home_score ?? 0,
        away_score: patch.away_score ?? 0,
        match_minute: patch.match_minute ?? null,
        home_team_id: homeRow.id,
        away_team_id: awayRow.id,
        competition_id: competitionId,
        home_team_logo: homeLogo || homeRow.logo_url,
        away_team_logo: awayLogo || awayRow.logo_url,
        home_team_color: homeRow.color_primary,
        away_team_color: awayRow.color_primary,
        api_football_id: fid,
      };

      const { error: upErr } = await admin.from("matches").upsert(insert, { onConflict: "api_football_id" });
      if (upErr) {
        result.errors.push(`match fixture ${String(fid)}: ${upErr.message}`);
        continue;
      }
      result.matchesUpserted += 1;
    }
  }

  return result;
}
