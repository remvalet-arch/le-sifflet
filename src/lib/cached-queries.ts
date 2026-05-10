import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LobbyMatchRow } from "@/types/lobby";
import type { LobbyDayFetchMeta } from "@/lib/lobby-queries";
import { LOBBY_MATCH_SELECT } from "@/lib/lobby-queries";
import {
  isLobbyTrackedLeagueApiId,
  LOBBY_TRACKED_LEAGUE_API_IDS,
} from "@/lib/constants/top-leagues";
import {
  getLobbyCalendarDayYmd,
  parisCivilDayYmdFromInstant,
  parisDayUtcRangeIso,
} from "@/lib/paris-day";

// ── Badges — global, updated by admin only ──────────────────────────────────
export const getCachedBadges = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("badges")
      .select("*")
      .order("created_at");
    return data ?? [];
  },
  ["badges-all"],
  { revalidate: 3600 },
);

// ── Current season — changes at most once per month ─────────────────────────
export const getCachedCurrentSeason = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("seasons")
      .select("id, label, ends_at")
      .eq("is_current", true)
      .maybeSingle();
    return data ?? null;
  },
  ["current-season"],
  { revalidate: 300 },
);

// ── Lobby: today's matches (day-mode with next-day fallback) ────────────────
// 30 s cache — safe since in-match real-time is handled by Realtime subscriptions.
export const getCachedLobbyDayMatches = unstable_cache(
  async (): Promise<{
    data: LobbyMatchRow[];
    error: Error | null;
    meta: LobbyDayFetchMeta;
  }> => {
    const supabase = createAdminClient();
    const primaryYmd = getLobbyCalendarDayYmd();

    let startIso: string, endExclusiveIso: string;
    try {
      ({ startIso, endExclusiveIso } = parisDayUtcRangeIso(primaryYmd));
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

    const { data, error } = await supabase
      .from("matches")
      .select(LOBBY_MATCH_SELECT)
      .gte("start_time", startIso)
      .lt("start_time", endExclusiveIso)
      .in("competition.api_football_league_id", [
        ...LOBBY_TRACKED_LEAGUE_API_IDS,
      ])
      .order("start_time", { ascending: true });

    if (error) {
      return {
        data: [],
        error: new Error(error.message),
        meta: {
          primaryFootballDayYmd: primaryYmd,
          shownParisDayYmd: primaryYmd,
          isFallback: false,
        },
      };
    }

    if (data && data.length > 0) {
      return {
        data: data as unknown as LobbyMatchRow[],
        error: null,
        meta: {
          primaryFootballDayYmd: primaryYmd,
          shownParisDayYmd: primaryYmd,
          isFallback: false,
        },
      };
    }

    // No matches today — find the next available day
    const { data: nextRows, error: nextErr } = await supabase
      .from("matches")
      .select(
        "start_time, competition:competitions!matches_competition_id_fkey!inner(api_football_league_id)",
      )
      .gte("start_time", endExclusiveIso)
      .in("competition.api_football_league_id", [
        ...LOBBY_TRACKED_LEAGUE_API_IDS,
      ])
      .order("start_time", { ascending: true })
      .limit(1);

    if (nextErr || !nextRows?.[0]?.start_time) {
      return {
        data: [],
        error: nextErr ? new Error(nextErr.message) : null,
        meta: {
          primaryFootballDayYmd: primaryYmd,
          shownParisDayYmd: primaryYmd,
          isFallback: false,
        },
      };
    }

    const shownParisDayYmd = parisCivilDayYmdFromInstant(
      new Date(nextRows[0].start_time),
    );

    let startIso2: string, endExclusiveIso2: string;
    try {
      ({ startIso: startIso2, endExclusiveIso: endExclusiveIso2 } =
        parisDayUtcRangeIso(shownParisDayYmd));
    } catch (e) {
      return {
        data: [],
        error: e instanceof Error ? e : new Error(String(e)),
        meta: {
          primaryFootballDayYmd: primaryYmd,
          shownParisDayYmd,
          isFallback: true,
        },
      };
    }

    const { data: data2, error: error2 } = await supabase
      .from("matches")
      .select(LOBBY_MATCH_SELECT)
      .gte("start_time", startIso2)
      .lt("start_time", endExclusiveIso2)
      .in("competition.api_football_league_id", [
        ...LOBBY_TRACKED_LEAGUE_API_IDS,
      ])
      .order("start_time", { ascending: true });

    if (error2) {
      return {
        data: [],
        error: new Error(error2.message),
        meta: {
          primaryFootballDayYmd: primaryYmd,
          shownParisDayYmd,
          isFallback: true,
        },
      };
    }

    return {
      data: (data2 ?? []) as unknown as LobbyMatchRow[],
      error: null,
      meta: {
        primaryFootballDayYmd: primaryYmd,
        shownParisDayYmd,
        isFallback: true,
      },
    };
  },
  ["lobby-day-matches"],
  { revalidate: 30 },
);

// ── Lobby: matches by round ─────────────────────────────────────────────────
// Args are part of the cache key automatically via Next.js unstable_cache.
export const getCachedLobbyRoundMatches = unstable_cache(
  async (
    leagueApiId: number,
    roundShort: string,
  ): Promise<{ data: LobbyMatchRow[]; error: Error | null }> => {
    if (!isLobbyTrackedLeagueApiId(leagueApiId)) {
      return {
        data: [],
        error: new Error("Paramètres ligue ou round invalides."),
      };
    }
    const { data, error } = await createAdminClient()
      .from("matches")
      .select(LOBBY_MATCH_SELECT)
      .eq("round_short", roundShort.trim())
      .eq("competition.api_football_league_id", leagueApiId)
      .order("start_time", { ascending: true });

    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data ?? []) as unknown as LobbyMatchRow[], error: null };
  },
  ["lobby-round-matches"],
  { revalidate: 30 },
);
