import { EUROPEAN_CUP_API_IDS } from "@/lib/constants/top-leagues";

/**
 * Labels de phases éliminatoires produits par API-Football.
 * Ces labels ne doivent apparaître que dans les compétitions à format coupe.
 */
const KNOCKOUT_ROUND_PATTERNS = [
  /quarter/i,
  /semi/i,
  /final/i,
  /8th/i,
  /round of 16/i,
  /round of 32/i,
  /play-?off/i,
  /barrages/i,
  /barrage/i,
];

/** Retourne true si la compétition supporte les phases éliminatoires. */
export function leagueHasKnockoutRounds(leagueApiId: number): boolean {
  return EUROPEAN_CUP_API_IDS.includes(leagueApiId);
}

/** Retourne true si le label de round est de type phase éliminatoire. */
export function isKnockoutRoundLabel(roundShort: string): boolean {
  return KNOCKOUT_ROUND_PATTERNS.some((p) => p.test(roundShort));
}

/**
 * Filtre la liste des rounds d'une ligue :
 * - Ligues domestiques → exclut les rounds éliminatoires (anomalies API)
 * - Coupes européennes → affiche tous les rounds
 */
export function filterRoundsForLeague(
  rounds: string[],
  leagueApiId: number,
): string[] {
  if (leagueHasKnockoutRounds(leagueApiId)) return rounds;
  return rounds.filter((r) => !isKnockoutRoundLabel(r));
}
