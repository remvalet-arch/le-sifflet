/**
 * Journée calendrier « lobby » en Europe/Paris + bornes UTC pour filtre Supabase sur `start_time`.
 */

import { PARIS_TZ } from "@/lib/format-match-time";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Jour civil **Europe/Paris** pour le lobby (aligné avec `fetchLobbyMatchesForParisDay` + `parisDayUtcRangeIso`).
 * `NEXT_PUBLIC_LOBBY_DATE` (YYYY-MM-DD) force une journée de test ; sinon date du jour à Paris.
 */
export function getLobbyCalendarDayYmd(now: Date = new Date()): string {
  const env = process.env.NEXT_PUBLIC_LOBBY_DATE?.trim();
  if (env && YMD.test(env)) return env;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * `[start_time >= startIso, start_time < endExclusiveIso)` couvrant exactement le jour civil `ymd` à Paris.
 */
export function parisDayUtcRangeIso(ymd: string): { startIso: string; endExclusiveIso: string } {
  if (!YMD.test(ymd)) {
    throw new Error(`parisDayUtcRangeIso: date invalide « ${ymd} »`);
  }
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10)) as [number, number, number];
  const anchor = Date.UTC(y, mo - 1, d);
  const label = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: PARIS_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms));

  let dayMin = Infinity;
  for (let delta = -36; delta <= 36; delta++) {
    const ms = anchor + delta * 3600000;
    if (label(ms) === ymd) {
      dayMin = Math.min(dayMin, ms);
    }
  }
  if (!Number.isFinite(dayMin)) {
    throw new Error(`parisDayUtcRangeIso: aucun instant Paris pour ${ymd}`);
  }
  while (label(dayMin - 60 * 1000) === ymd) {
    dayMin -= 60 * 1000;
  }

  let t = dayMin;
  let last = dayMin;
  while (label(t) === ymd) {
    last = t;
    t += 60 * 1000;
  }
  const endExclusiveIso = new Date(last + 60 * 1000).toISOString();
  return { startIso: new Date(dayMin).toISOString(), endExclusiveIso };
}
