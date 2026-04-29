import type { MatchRow, MatchStatus } from "@/types/database";

export type { MatchStatus, MatchRow } from "@/types/database";

const STATUS_ORDER: Record<MatchStatus, number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
};

/** Lobby : live d’abord, puis upcoming, puis finished ; puis start_time croissant. */
export function sortMatchesForLobby(matches: MatchRow[]): MatchRow[] {
  return [...matches].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99;
    const ob = STATUS_ORDER[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}
