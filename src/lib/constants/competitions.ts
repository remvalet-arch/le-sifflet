/**
 * Mapping locale → api_football_league_ids for default competition preferences.
 * UCL (2) is always included.
 */
export const LOCALE_DEFAULT_LEAGUE_IDS: Record<string, number[]> = {
  fr: [61, 2], // Ligue 1 + UCL
  en: [39, 2], // Premier League + UCL
  es: [140, 2], // La Liga + UCL
  de: [78, 2], // Bundesliga + UCL
  it: [135, 2], // Serie A + UCL
  pt: [94, 2], // Primeira Liga + UCL
};

/** Fallback when locale is unknown. */
export const FALLBACK_DEFAULT_LEAGUE_IDS: number[] = [61, 2]; // Ligue 1 + UCL

/** API Football league IDs in priority order for onboarding pre-selection. */
export const COMPETITION_DISPLAY_ORDER: number[] = [61, 39, 140, 135, 78, 2, 3];
