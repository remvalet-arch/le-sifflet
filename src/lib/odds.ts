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
  const adjusted   = baseOdd * (1 - 0.35 * popularity);
  return Math.max(1.10, Math.round(adjusted * 10) / 10);
}
