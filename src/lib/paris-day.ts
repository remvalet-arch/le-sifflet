/**
 * Journée « lobby » en Europe/Paris + bornes UTC pour filtre Supabase sur `start_time`.
 * Jour par défaut = **football day** : (instant − 4h) puis date civile à Paris (minuit → encore la veille jusqu’à 04h).
 */

import { PARIS_TZ } from "@/lib/format-match-time";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const FOOTBALL_DAY_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * Date civile **Europe/Paris** (YYYY-MM-DD) pour un instant, sans décalage « football ».
 */
export function parisCivilDayYmdFromInstant(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * **Football day** : on retire 4h à l’instant puis on lit la date civile à Paris.
 * (Ex. 00h30 le 4 mai → encore le 3 mai ; le « 4 mai » commence à 04h00.)
 */
export function footballDayYmdParis(instant: Date): string {
  return parisCivilDayYmdFromInstant(
    new Date(instant.getTime() - FOOTBALL_DAY_OFFSET_MS),
  );
}

/**
 * Jour par défaut du lobby pour filtres + libellés « aujourd’hui ».
 * `NEXT_PUBLIC_LOBBY_DATE` (YYYY-MM-DD) force une journée de test (sans décalage 4h).
 * Sinon : **football day** à partir de `now`.
 */
export function getLobbyCalendarDayYmd(now: Date = new Date()): string {
  const env = process.env.NEXT_PUBLIC_LOBBY_DATE?.trim();
  if (env && YMD.test(env)) return env;
  return footballDayYmdParis(now);
}

/** Libellé long français pour une date `YYYY-MM-DD` (Paris, midi UTC pour éviter les ambiguïtés de fuseau). */
export function formatParisYmdLongFr(ymd: string): string {
  if (!YMD.test(ymd)) return ymd;
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10)) as [
    number,
    number,
    number,
  ];
  const noonUtc = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(noonUtc);
}

/**
 * `[start_time >= startIso, start_time < endExclusiveIso)` couvrant exactement le jour civil `ymd` à Paris.
 */
export function parisDayUtcRangeIso(ymd: string): {
  startIso: string;
  endExclusiveIso: string;
} {
  if (!YMD.test(ymd)) {
    throw new Error(`parisDayUtcRangeIso: date invalide « ${ymd} »`);
  }
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10)) as [
    number,
    number,
    number,
  ];
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
