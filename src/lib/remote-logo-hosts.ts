/**
 * Hôtes autorisés pour `next/image` + détection côté lobby (logos TheSportsDB + API-Sports).
 * Les URLs ligue API-Football passent souvent par `media.api-sports.io` ou des sous-domaines `*.api-sports.io`.
 */

export const REMOTE_LOGO_HOSTNAMES = new Set([
  "www.thesportsdb.com",
  "r2.thesportsdb.com",
  "media.api-sports.io",
]);

export function isRemoteLogoHostname(hostname: string): boolean {
  if (REMOTE_LOGO_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith(".api-sports.io")) return true;
  return false;
}

export function isNextImageRemoteLogoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && isRemoteLogoHostname(u.hostname);
  } catch {
    return false;
  }
}
