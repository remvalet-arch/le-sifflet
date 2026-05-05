const AWAY_FALLBACK = "#FFFFFF";
const MIN_COLOR_DISTANCE = 60;

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

/**
 * Prevents color clash between home and away jerseys / stat bars.
 * If both colors are too similar (Euclidean RGB distance < 60), forces
 * away to white so they remain distinguishable.
 */
export function resolveTeamColors(
  homeColor: string | null | undefined,
  awayColor: string | null | undefined,
  fallbackHome = "#166534",
  fallbackAway = "#14532d",
): { home: string; away: string } {
  const home = homeColor ?? fallbackHome;
  const away = awayColor ?? fallbackAway;
  if (colorDistance(home, away) < MIN_COLOR_DISTANCE) {
    return { home, away: AWAY_FALLBACK };
  }
  return { home, away };
}
