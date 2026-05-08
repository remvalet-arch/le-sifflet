export function getMinBetForBalance(balance: number): number {
  if (balance < 5_000) return 5;
  if (balance < 20_000) return 50;
  if (balance < 50_000) return 200;
  if (balance < 100_000) return 500;
  return 1_000;
}

export const MIN_BET_TIERS = [
  { threshold: 5_000, min: 5 },
  { threshold: 20_000, min: 50 },
  { threshold: 50_000, min: 200 },
  { threshold: 100_000, min: 500 },
  { threshold: Infinity, min: 1_000 },
] as const;
