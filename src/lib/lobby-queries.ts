import { TOP_LEAGUE_API_IDS } from "@/lib/constants/top-leagues";
import { getLobbyCalendarDayYmd, parisDayUtcRangeIso } from "@/lib/paris-day";
import type { LobbyMatchRow } from "@/types/lobby";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Matchs du jour civil **Europe/Paris** (`getLobbyCalendarDayYmd`) + filtre Top 5 uniquement
 * (`api_football_league_id` ∈ API-Football — pas de logique TheSportsDB).
 */
export const LOBBY_MATCH_SELECT = `
  *,
  home_team:teams!matches_home_team_id_fkey(id,name,logo_url,competition_id,color_primary),
  away_team:teams!matches_away_team_id_fkey(id,name,logo_url,competition_id,color_primary),
  competition:competitions!matches_competition_id_fkey!inner(id,name,badge_url,api_football_league_id),
  match_timeline_events(id,event_type,minute,team_side,player_name)
`;

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
    .in("competition.api_football_league_id", [...TOP_LEAGUE_API_IDS])
    .order("start_time", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as unknown as LobbyMatchRow[], error: null };
}
