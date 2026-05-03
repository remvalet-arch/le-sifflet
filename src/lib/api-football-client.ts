/** Base URL API-Sports v3 (sans slash final). */
export const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/**
 * Année de saison telle que l’API-Football la nomme : **2025** = championnats 2025/2026 (pas 2026).
 * Surcharge optionnelle : variable d’environnement `API_FOOTBALL_SEASON` (nombre, ex. `2025`).
 */
export function getApiFootballSeasonYear(): number {
  const raw = process.env.API_FOOTBALL_SEASON?.trim();
  if (raw !== undefined && raw !== "" && raw !== "undefined") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 1990 && n <= 2100) return n;
  }
  return 2025;
}

function getApiFootballKey(): string {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (key === undefined || key === "" || key === "undefined") {
    throw new Error("API_FOOTBALL_KEY manquante ou vide");
  }
  return key;
}

/**
 * Appel HTTP JSON vers API-Football v3 (api-sports.io).
 * @param endpoint chemin relatif, ex. `"teams"` ou `"/fixtures"`
 * @param params query string (déjà encodée via `URLSearchParams`)
 */
export async function fetchApiFootball<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const key = getApiFootballKey();
  const path = endpoint.replace(/^\//, "");
  const url = new URL(`${API_FOOTBALL_BASE_URL}/${path}`);
  if (params !== undefined) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": key,
      "x-apisports-host": "v3.football.api-sports.io",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API-Football HTTP ${String(res.status)} sur ${path}`);
  }

  return res.json() as Promise<T>;
}
