/**
 * Évite les open redirects : uniquement chemins relatifs internes.
 */
export function safeInternalPath(
  next: string | null,
  fallback = "/lobby",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}
