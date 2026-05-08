export const ALERT_THRESHOLD = 2; // fallback si la RPC échoue
export const ALERT_WINDOW_SECONDS = 30;
export const COOLDOWN_MINUTES = 5;
export const MIN_TRUST_ALERT_SCORE = 50;

/** Seuil dynamique basé sur l'audience active du match (Sprint Q). */
export function getRequiredSignals(activeUsersCount: number): number {
  if (activeUsersCount <= 5) return 1; // Mode amorçage : 1 signal suffit
  if (activeUsersCount <= 20) return 2;
  if (activeUsersCount <= 100) return 3;
  return 5; // Anti-spam sur les très gros matchs
}
