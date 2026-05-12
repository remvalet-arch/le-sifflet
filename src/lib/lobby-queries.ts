import { isLobbyTrackedLeagueApiId } from "@/lib/constants/top-leagues";

/** Métadonnées jour lobby (mode « jour » uniquement). */
export type LobbyDayFetchMeta = {
  /** Jour football demandé en premier (getLobbyCalendarDayYmd). */
  primaryFootballDayYmd: string;
  /** Jour civil Paris des matchs affichés (= primary si pas de fallback). */
  shownParisDayYmd: string;
  isFallback: boolean;
};

/**
 * Matchs du **football day** Paris (`ymd` ou `getLobbyCalendarDayYmd()`) + filtre Top 5 + coupes UEFA
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
  const leagueStr =
    (Array.isArray(leagueRaw) ? leagueRaw[0] : leagueRaw)?.trim() ?? "";
  const roundEnc =
    (Array.isArray(roundRaw) ? roundRaw[0] : roundRaw)?.trim() ?? "";
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
