import type { MatchRow, MatchStatus } from "@/types/database";

export type { MatchStatus, MatchRow } from "@/types/database";

const STATUS_ORDER: Record<MatchStatus, number> = {
  first_half:  0,
  second_half: 0,
  paused:      0,
  half_time:   1,
  upcoming:    2,
  finished:    3,
};

export function isMatchInProgress(status: MatchStatus): boolean {
  return (
    status === "first_half" ||
    status === "second_half" ||
    status === "half_time" ||
    status === "paused"
  );
}

/** Lobby : en cours d’abord, puis upcoming, puis finished ; puis start_time croissant. */
export function sortMatchesForLobby(matches: MatchRow[]): MatchRow[] {
  return [...matches].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99;
    const ob = STATUS_ORDER[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}
