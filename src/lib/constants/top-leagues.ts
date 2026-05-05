/**
 * Top 5 européen — IDs ligue API-Football v3 (saison métier 2025 = 2025/2026).
 * Ordre = onglets lobby (Direct / Europe gérés à part).
 */
export const TOP_LEAGUES = [
  { apiFootballLeagueId: 61, tabKey: "l1", label: "Ligue 1" },
  { apiFootballLeagueId: 39, tabKey: "pl", label: "Premier League" },
  { apiFootballLeagueId: 140, tabKey: "liga", label: "La Liga" },
  { apiFootballLeagueId: 135, tabKey: "seriea", label: "Serie A" },
  { apiFootballLeagueId: 78, tabKey: "bundesliga", label: "Bundesliga" },
] as const;

/** Coupes UEFA (API-Football) — onglet agrégé « Europe » au lobby + import calendrier. */
export const EUROPEAN_CUPS = [
  { apiFootballLeagueId: 2, label: "Champions League" },
  { apiFootballLeagueId: 3, label: "Europa League" },
] as const;

/** IDs ligue API du Top 5 uniquement. */
export const TOP_LEAGUE_API_IDS: readonly number[] = TOP_LEAGUES.map(
  (l) => l.apiFootballLeagueId,
);

/** IDs des coupes UEFA (lobby + sync). */
export const EUROPEAN_CUP_API_IDS: readonly number[] = EUROPEAN_CUPS.map(
  (c) => c.apiFootballLeagueId,
);

/** Toutes les compétitions suivies au lobby et en import admin (Top 5 + UEFA). */
export const LOBBY_TRACKED_LEAGUE_API_IDS: readonly number[] = [
  ...TOP_LEAGUES.map((l) => l.apiFootballLeagueId),
  ...EUROPEAN_CUPS.map((c) => c.apiFootballLeagueId),
];

export type TopLeagueTabKey = (typeof TOP_LEAGUES)[number]["tabKey"];

export type LobbyExtraTabKey = "europe";

export type LobbyTabKey = "direct" | TopLeagueTabKey | LobbyExtraTabKey;

export function isEuropeanCupApiId(id: number | null | undefined): boolean {
  return id != null && EUROPEAN_CUPS.some((c) => c.apiFootballLeagueId === id);
}

/** Top 5 domestique uniquement (exclut les coupes). */
export function isTopLeagueApiId(id: number | null | undefined): boolean {
  return id != null && TOP_LEAGUES.some((l) => l.apiFootballLeagueId === id);
}

/** Top 5 ou coupe UEFA — filtre lobby / requête `fetchLobbyMatchesForParisDay`. */
export function isLobbyTrackedLeagueApiId(
  id: number | null | undefined,
): boolean {
  return id != null && LOBBY_TRACKED_LEAGUE_API_IDS.includes(id);
}

export function topLeagueByApiId(id: number | null | undefined) {
  if (id == null) return undefined;
  return TOP_LEAGUES.find((l) => l.apiFootballLeagueId === id);
}

export function europeanCupByApiId(id: number | null | undefined) {
  if (id == null) return undefined;
  return EUROPEAN_CUPS.find((c) => c.apiFootballLeagueId === id);
}

/** Libellé stable (Top 5, coupe UEFA, ou repli). */
export function lobbyTrackedLeagueLabel(
  apiLeagueId: number | null | undefined,
): string {
  const row = topLeagueByApiId(apiLeagueId) ?? europeanCupByApiId(apiLeagueId);
  if (row) return row.label;
  if (apiLeagueId != null) return `Compétition ${String(apiLeagueId)}`;
  return "Autres compétitions";
}

/** Libellé lobby stable par ID ligue API (évite « Ligue 1 » vs « French Ligue 1 »). */
export function topLeagueDisplayLabel(
  apiLeagueId: number | null | undefined,
  fallbackCompetitionName?: string | null,
): string {
  const tracked =
    topLeagueByApiId(apiLeagueId) ?? europeanCupByApiId(apiLeagueId);
  if (tracked) return tracked.label;
  const fb = (fallbackCompetitionName ?? "").trim();
  if (fb !== "") return fb;
  return "Autres compétitions";
}
