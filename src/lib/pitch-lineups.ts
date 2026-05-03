/** Lignes terrain : seuls G, D, A sont stricts ; tout le reste (M + libellés bruts) → ligne milieu. */
const PITCH_STRICT_LINES = new Set(["G", "D", "A"]);

export function startersForPitchRow<T extends { position: string; player_name: string }>(
  starters: T[],
  row: "G" | "D" | "M" | "A",
): T[] {
  if (row === "G") return starters.filter((p) => p.position === "G");
  if (row === "D") return starters.filter((p) => p.position === "D");
  if (row === "A") return starters.filter((p) => p.position === "A");
  return starters.filter((p) => !PITCH_STRICT_LINES.has(p.position));
}
