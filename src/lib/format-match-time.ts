/** Affichage des horaires de match en fuseau Europe/Paris (évite UTC serveur sur Vercel). */
export const PARIS_TZ = "Europe/Paris";

/**
 * Normalise une chaîne `timestamptz` / ISO pour que `Date` l’interprète en UTC.
 * Sans suffixe Z ou offset, JS peut traiter la date comme heure **locale** (bug +15 min, etc.).
 */
function hasExplicitTimeZone(iso: string): boolean {
  if (/z$/i.test(iso)) return true;
  const i = iso.indexOf("T");
  if (i < 0) return false;
  const tail = iso.slice(i + 1);
  return /[+-]\d{2}:\d{2}$/.test(tail) || /[+-]\d{4}$/.test(tail);
}

export function normalizeMatchStartTimeIso(iso: string): string {
  let s = (iso ?? "").trim();
  if (!s) return s;
  if (!s.includes("T") && s.length >= 10) {
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  }
  if (!hasExplicitTimeZone(s)) {
    const noMs = s.replace(/\.\d+$/, "");
    return noMs.endsWith("Z") ? noMs : `${noMs}Z`;
  }
  return s;
}

const parisTimeParts = (isoUtc: string): { hour: string; minute: string } | null => {
  const d = new Date(normalizeMatchStartTimeIso(isoUtc));
  if (Number.isNaN(d.getTime())) return null;
  const f = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    hour12: false,
  });
  const parts = f.formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  if (hour === undefined || minute === undefined) return null;
  return { hour, minute };
};

/**
 * Heure locale Paris (`HH:mm`, 24 h) pour un instant UTC stocké en base.
 * Utilise `formatToParts` pour éviter les artefacts de certains locales + date+heure combinés.
 */
export function formatMatchTime(isoUtc: string): string {
  const p = parisTimeParts(isoUtc);
  if (!p) return "—";
  return `${p.hour}:${p.minute}`;
}

/** @deprecated Alias — préférer `formatMatchTime`. */
export const formatMatchTimeParis = formatMatchTime;

/**
 * Libellé court type `sam. 3 mai, 15:00` (Paris) — date et heure formatées séparément.
 */
export function formatMatchDateTimeParis(isoUtc: string): string {
  const d = new Date(normalizeMatchStartTimeIso(isoUtc));
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${datePart}, ${formatMatchTime(isoUtc)}`;
}
