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

const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Appel HTTP JSON vers API-Football v3 (api-sports.io).
 * Retry automatique : 3 tentatives max, délai exponentiel 100ms × 2^attempt.
 * @param endpoint chemin relatif, ex. `"teams"` ou `"/fixtures"`
 * @param params query string
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

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await delay(100 * Math.pow(2, attempt));
    }
    try {
      const res = await fetch(url.toString(), {
        headers: {
          "x-apisports-key": key,
          "x-apisports-host": "v3.football.api-sports.io",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        // Ne pas retrier les 4xx (erreur client)
        if (res.status >= 400 && res.status < 500) {
          throw new Error(
            `API-Football HTTP ${String(res.status)} sur ${path}`,
          );
        }
        lastError = new Error(
          `API-Football HTTP ${String(res.status)} sur ${path}`,
        );
        continue;
      }

      return res.json() as Promise<T>;
    } catch (err) {
      if (err instanceof Error) {
        lastError = err;
        // Ne pas retrier les erreurs 4xx relancées ci-dessus
        if (lastError.message.includes(" 4")) throw lastError;
      }
    }
  }

  throw lastError;
}
