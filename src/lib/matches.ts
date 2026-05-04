import type { MatchRow, MatchStatus } from "@/types/database";

export type { MatchStatus, MatchRow } from "@/types/database";

/** Statuts affichés dans la section « En direct » du lobby (aligné Realtime / sync live). */
export const LOBBY_LIVE_STATUSES: readonly MatchStatus[] = [
  "first_half",
  "half_time",
  "second_half",
  "paused",
];

export function isLobbyLiveStatus(status: MatchStatus): boolean {
  return LOBBY_LIVE_STATUSES.includes(status);
}

/** @deprecated Préférer `isLobbyLiveStatus` ; alias conservé pour le reste du code. */
export function isMatchInProgress(status: MatchStatus): boolean {
  return isLobbyLiveStatus(status);
}

/** Libellé court FR (majuscules) pour l’UI — minute gérée à part (ex. Scoreboard). */
export function formatMatchStatus(status: MatchStatus): string {
  switch (status) {
    case "first_half":
      return "1ÈRE MI-TEMPS";
    case "half_time":
      return "MI-TEMPS";
    case "second_half":
      return "2ÈME MI-TEMPS";
    case "paused":
      return "EN PAUSE";
    case "finished":
      return "TERMINÉ";
    case "upcoming":
      return "À VENIR";
  }
}

const STATUS_ORDER: Record<MatchStatus, number> = {
  first_half: 0,
  second_half: 0,
  paused: 0,
  half_time: 1,
  upcoming: 2,
  finished: 3,
};

/** Lobby : en cours d’abord, puis upcoming, puis finished ; puis start_time croissant. */
export function sortMatchesForLobby<
  T extends Pick<MatchRow, "status" | "start_time">,
>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99;
    const ob = STATUS_ORDER[b.status] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}
