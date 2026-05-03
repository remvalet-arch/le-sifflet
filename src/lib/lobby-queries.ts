import { isLobbyTrackedLeagueApiId, LOBBY_TRACKED_LEAGUE_API_IDS } from "@/lib/constants/top-leagues";
import { getLobbyCalendarDayYmd, parisDayUtcRangeIso } from "@/lib/paris-day";
import type { LobbyMatchRow } from "@/types/lobby";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Matchs du jour civil **Europe/Paris** (`getLobbyCalendarDayYmd`) + filtre Top 5 + coupes UEFA
 * (`api_football_league_id` ∈ `LOBBY_TRACKED_LEAGUE_API_IDS`).
 */
/** `match_timeline_events` : buteurs lobby filtrés côté UI sur `event_type === goal` (voir `MatchLobby`). */
export const LOBBY_MATCH_SELECT = `
  *,
  home_team:teams!matches_home_team_id_fkey(id,name,logo_url,competition_id,color_primary),
  away_team:teams!matches_away_team_id_fkey(id,name,logo_url,competition_id,color_primary),
  competition:competitions!matches_competition_id_fkey!inner(id,name,badge_url,api_football_league_id),
  match_timeline_events(id,event_type,minute,team_side,player_name)
`;

/** Parse `?league=<api_id>&round=<round_short>` (valeurs encodées côté URL). */
export function parseLobbyRoundParams(
  sp: Record<string, string | string[] | undefined>,
): { leagueApiId: number; roundShort: string } | null {
  const leagueRaw = sp.league;
  const roundRaw = sp.round;
  const leagueStr = (Array.isArray(leagueRaw) ? leagueRaw[0] : leagueRaw)?.trim() ?? "";
  const roundEnc = (Array.isArray(roundRaw) ? roundRaw[0] : roundRaw)?.trim() ?? "";
  if (leagueStr === "" || roundEnc === "") return null;
  const n = parseInt(leagueStr, 10);
  if (Number.isNaN(n) || !isLobbyTrackedLeagueApiId(n)) return null;
  let roundShort: string;
  try {
    roundShort = decodeURIComponent(roundEnc);
  } catch {
    return null;
  }
  if (roundShort.trim() === "") return null;
  return { leagueApiId: n, roundShort: roundShort.trim() };
}

/** Tous les matchs d’une même journée/tour (`round_short`) pour une ligue API (sans filtre jour Paris). */
export async function fetchLobbyMatchesByRound(
  supabase: SupabaseClient<Database>,
  apiFootballLeagueId: number,
  roundShort: string,
): Promise<{ data: LobbyMatchRow[]; error: Error | null }> {
  const trimmed = roundShort.trim();
  if (trimmed === "" || !isLobbyTrackedLeagueApiId(apiFootballLeagueId)) {
    return { data: [], error: new Error("Paramètres ligue ou round invalides.") };
  }

  const { data, error } = await supabase
    .from("matches")
    .select(LOBBY_MATCH_SELECT)
    .eq("round_short", trimmed)
    .eq("competition.api_football_league_id", apiFootballLeagueId)
    .order("start_time", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as unknown as LobbyMatchRow[], error: null };
}

export async function fetchLobbyMatchesForParisDay(
  supabase: SupabaseClient<Database>,
): Promise<{ data: LobbyMatchRow[]; error: Error | null }> {
  const ymd = getLobbyCalendarDayYmd();
  let startIso: string;
  let endExclusiveIso: string;
  try {
    ({ startIso, endExclusiveIso } = parisDayUtcRangeIso(ymd));
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }

  const { data, error } = await supabase
    .from("matches")
    .select(LOBBY_MATCH_SELECT)
    .gte("start_time", startIso)
    .lt("start_time", endExclusiveIso)
    .in("competition.api_football_league_id", [...LOBBY_TRACKED_LEAGUE_API_IDS])
    .order("start_time", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as unknown as LobbyMatchRow[], error: null };
}
