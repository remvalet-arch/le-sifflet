const MIN_DISTANCE = 60;
const FALLBACK_LIGHT = "#FFFFFF";
const FALLBACK_DARK = "#111827";

function hexToRgb(hex: string): [number, number, number] | null {
  if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 999;
  return Math.sqrt(
    (ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2,
  );
}

export function hasGoodContrast(hex1: string, hex2: string): boolean {
  return colorDistance(hex1, hex2) >= MIN_DISTANCE;
}

/**
 * Home always keeps its primary color.
 * Away: tries primary → secondary → white/dark fallback until contrast is achieved.
 */
export function resolveMatchColors(
  homePrimary: string | null | undefined,
  homeSecondary: string | null | undefined,
  awayPrimary: string | null | undefined,
  awaySecondary: string | null | undefined,
  fallbackHome = "#166534",
  fallbackAway = "#14532d",
): { finalHomeColor: string; finalAwayColor: string } {
  const finalHomeColor = homePrimary ?? fallbackHome;

  const awayCandidates: string[] = [
    awayPrimary,
    awaySecondary,
    FALLBACK_LIGHT,
    FALLBACK_DARK,
  ].filter((c): c is string => !!c && /^#[0-9A-Fa-f]{6}$/i.test(c));

  const finalAwayColor =
    awayCandidates.find((c) => hasGoodContrast(finalHomeColor, c)) ??
    awayPrimary ??
    fallbackAway;

  return { finalHomeColor, finalAwayColor };
}
