/**
 * Top 5 européen — IDs ligue API-Football v3 (saison métier 2025 = 2025/2026).
 * Ordre = onglets lobby (Direct en tête géré à part).
 */
export const TOP_LEAGUES = [
  { apiFootballLeagueId: 61, tabKey: "l1", label: "Ligue 1" },
  { apiFootballLeagueId: 39, tabKey: "pl", label: "Premier League" },
  { apiFootballLeagueId: 140, tabKey: "liga", label: "La Liga" },
  { apiFootballLeagueId: 135, tabKey: "seriea", label: "Serie A" },
  { apiFootballLeagueId: 78, tabKey: "bundesliga", label: "Bundesliga" },
] as const;

/** IDs ligue API-Football du lobby (seule source de filtrage / groupement côté app). */
export const TOP_LEAGUE_API_IDS: readonly number[] = TOP_LEAGUES.map((l) => l.apiFootballLeagueId);

export type TopLeagueTabKey = (typeof TOP_LEAGUES)[number]["tabKey"];

export function isTopLeagueApiId(id: number | null | undefined): boolean {
  return id != null && TOP_LEAGUES.some((l) => l.apiFootballLeagueId === id);
}

export function topLeagueByApiId(id: number | null | undefined) {
  if (id == null) return undefined;
  return TOP_LEAGUES.find((l) => l.apiFootballLeagueId === id);
}

/** Libellé lobby stable par ID ligue API (évite « Ligue 1 » vs « French Ligue 1 »). */
export function topLeagueDisplayLabel(
  apiLeagueId: number | null | undefined,
  fallbackCompetitionName?: string | null,
): string {
  const row = topLeagueByApiId(apiLeagueId);
  if (row) return row.label;
  const fb = (fallbackCompetitionName ?? "").trim();
  if (fb !== "") return fb;
  return "Autres compétitions";
}
