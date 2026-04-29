export type MatchStatus = "upcoming" | "live" | "finished";

export type MatchRow = {
  id: string;
  team_home: string;
  team_away: string;
  status: MatchStatus;
  start_time: string;
  created_at: string;
};

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
