import {
  isLobbyTrackedLeagueApiId,
  LOBBY_TRACKED_LEAGUE_API_IDS,
} from "@/lib/constants/top-leagues";
import {
  getLobbyCalendarDayYmd,
  parisCivilDayYmdFromInstant,
  parisDayUtcRangeIso,
} from "@/lib/paris-day";
import type { LobbyMatchRow } from "@/types/lobby";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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

/** Tous les matchs d’une même journée/tour (`round_short`) pour une ligue API (sans filtre jour Paris). */
export async function fetchLobbyMatchesByRound(
  supabase: SupabaseClient<Database>,
  apiFootballLeagueId: number,
  roundShort: string,
): Promise<{ data: LobbyMatchRow[]; error: Error | null }> {
  const trimmed = roundShort.trim();
  if (trimmed === "" || !isLobbyTrackedLeagueApiId(apiFootballLeagueId)) {
    return {
      data: [],
      error: new Error("Paramètres ligue ou round invalides."),
    };
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
  ymd?: string,
): Promise<{ data: LobbyMatchRow[]; error: Error | null }> {
  const dayYmd = ymd ?? getLobbyCalendarDayYmd();
  let startIso: string;
  let endExclusiveIso: string;
  try {
    ({ startIso, endExclusiveIso } = parisDayUtcRangeIso(dayYmd));
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

/**
 * Jour football par défaut ; si 0 match, une requête légère (`start_time` seul) puis chargement
 * du **jour civil Paris** du prochain coup d’envoi (tous les matchs de ce jour).
 */
export async function fetchLobbyMatchesForParisDayWithFallback(
  supabase: SupabaseClient<Database>,
): Promise<{
  data: LobbyMatchRow[];
  error: Error | null;
  meta: LobbyDayFetchMeta;
}> {
  const primaryYmd = getLobbyCalendarDayYmd();
  const first = await fetchLobbyMatchesForParisDay(supabase, primaryYmd);
  if (first.error) {
    return {
      data: [],
      error: first.error,
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd: primaryYmd,
        isFallback: false,
      },
    };
  }
  if (first.data.length > 0) {
    return {
      data: first.data,
      error: null,
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd: primaryYmd,
        isFallback: false,
      },
    };
  }

  let endExclusiveIso: string;
  try {
    ({ endExclusiveIso } = parisDayUtcRangeIso(primaryYmd));
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd: primaryYmd,
        isFallback: false,
      },
    };
  }

  const { data: nextRows, error: nextErr } = await supabase
    .from("matches")
    .select(
      "start_time, competition:competitions!matches_competition_id_fkey!inner(api_football_league_id)",
    )
    .gte("start_time", endExclusiveIso)
    .in("competition.api_football_league_id", [...LOBBY_TRACKED_LEAGUE_API_IDS])
    .order("start_time", { ascending: true })
    .limit(1);

  if (nextErr) {
    return {
      data: [],
      error: new Error(nextErr.message),
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd: primaryYmd,
        isFallback: false,
      },
    };
  }

  const firstStart = nextRows?.[0]?.start_time;
  if (!firstStart) {
    return {
      data: [],
      error: null,
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd: primaryYmd,
        isFallback: false,
      },
    };
  }

  const shownParisDayYmd = parisCivilDayYmdFromInstant(new Date(firstStart));
  const second = await fetchLobbyMatchesForParisDay(supabase, shownParisDayYmd);
  if (second.error) {
    return {
      data: [],
      error: second.error,
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd,
        isFallback: true,
      },
    };
  }

  return {
    data: second.data,
    error: null,
    meta: {
      primaryFootballDayYmd: primaryYmd,
      shownParisDayYmd,
      isFallback: true,
    },
  };
}
