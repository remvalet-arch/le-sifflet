/**
 * Cotes dynamiques pour les paris Score Exact.
 * Plus un score est populaire (ratio), moins la cote est élevée.
 * Floor : ×1.10
 */
export function calculateDynamicOdds(
  baseOdd: number,
  totalBetsOnScore: number,
  totalBetsOverall: number,
): number {
  if (totalBetsOverall <= 0) return baseOdd;
  const popularity = totalBetsOnScore / totalBetsOverall;
  const adjusted = baseOdd * (1 - 0.35 * popularity);
  return Math.max(1.1, Math.round(adjusted * 10) / 10);
}

/**
 * Formule asymptotique : approche MAX_POINTS quand la cote monte.
 * Plancher à 10 pts. Fallback 50 pts si cote absente ou < 1.
 */
export function convertOddToPoints(
  odd: number | null | undefined,
  maxPoints = 220,
): number {
  if (odd == null || odd < 1) return 50;
  const pts = Math.round(maxPoints * (1 - 1 / odd));
  return Math.max(10, pts);
}

/** Cotes indicatives par position de buteur (valeurs de marché typiques). */
export const SCORER_DEFAULT_ODDS: Record<string, number> = {
  A: 3.5,
  M: 7.0,
  D: 15.0,
};

/** Pts potentiels MAX pour les buteurs (cumulables → plafond plus bas). */
export const SCORER_MAX_POINTS = 150;

/** Pts potentiels pour un prono score exact (1N2 inclus). */
export const EXACT_SCORE_DEFAULT_ODD = 10.0;
