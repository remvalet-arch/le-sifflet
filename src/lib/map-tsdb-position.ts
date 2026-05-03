/**
 * Mappe `strPosition` TheSportsDB vers G / D / M / A quand les mots-clés matchent,
 * sinon renvoie la chaîne brute pour audit en base.
 */
const EXACT: Record<string, "G" | "D" | "M" | "A"> = {
  Goalkeeper: "G",
  Defender: "D",
  Midfielder: "M",
  Forward: "A",
};

export function mapPosition(strPosition: string): string {
  const raw = (strPosition ?? "").trim();
  if (raw === "") return "Unknown";

  const mapped = EXACT[raw];
  if (mapped) return mapped;

  const s = raw.toLowerCase();

  if (s.includes("goal") || s.includes("gk")) return "G";

  if (
    s.includes("defend") ||
    s.includes("defenc") ||
    s.includes("back") ||
    s.includes("cb") ||
    s.includes("lb") ||
    s.includes("rb")
  ) {
    return "D";
  }

  if (
    s.includes("midfield") ||
    s.includes("cm") ||
    s.includes("cdm") ||
    s.includes("cam")
  ) {
    return "M";
  }

  if (
    s.includes("forward") ||
    s.includes("striker") ||
    s.includes("attack") ||
    s.includes("wing") ||
    s.includes("cf") ||
    s.includes("lw") ||
    s.includes("rw")
  ) {
    return "A";
  }

  return raw;
}
