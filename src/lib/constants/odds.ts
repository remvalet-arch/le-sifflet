import type { MarketEventType } from "@/types/database";

export const PEAK_ODDS: Record<MarketEventType, { oui: number; non: number }> =
  {
    penalty_check:   { oui: 1.30, non: 3.00 },
    penalty_outcome: { oui: 1.25, non: 4.50 },
    var_goal:        { oui: 1.40, non: 2.50 },
    red_card:        { oui: 1.15, non: 4.00 },
    injury_sub:      { oui: 1.20, non: 3.50 },
    // Coups de pied arrêtés — fenêtre temporelle de 3 min → probabilité modérée
    free_kick:       { oui: 1.80, non: 1.50 },
    corner:          { oui: 2.00, non: 1.30 },
  };

const TOTAL_SECONDS = 90;
const HOLD_SECONDS = 10;   // cote à taux plein les 10 premières secondes
const DECAY_RATE = 0.025;  // −2.5 % de l'écart (cote-1) par seconde après HOLD
const MIN_ODDS = 1.01;

function decayAt(peak: number, elapsed: number): number {
  if (elapsed <= HOLD_SECONDS) return peak;
  const t = elapsed - HOLD_SECONDS;
  const raw = 1 + (peak - 1) * Math.pow(1 - DECAY_RATE, t);
  return Math.max(MIN_ODDS, Math.round(raw * 100) / 100);
}

/** Calcule les cotes courantes (côté client, appels chaque seconde). */
export function computeCurrentOdds(
  type: MarketEventType,
  createdAt: string,
): { oui: number; non: number; elapsed: number; expired: boolean } {
  const elapsed = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  const expired = elapsed >= TOTAL_SECONDS;
  const peak = PEAK_ODDS[type] ?? { oui: 1.30, non: 2.00 };

  if (expired) {
    return { oui: MIN_ODDS, non: MIN_ODDS, elapsed, expired: true };
  }

  return {
    oui: decayAt(peak.oui, elapsed),
    non: decayAt(peak.non, elapsed),
    elapsed,
    expired: false,
  };
}

/**
 * Retourne la cote MAX autorisée côté serveur (avec tolérance réseau).
 * À appeler dans /api/bet pour valider le multiplicateur envoyé par le client.
 */
export function maxAllowedMultiplier(
  type: MarketEventType,
  createdAt: string,
  option: "oui" | "non",
  toleranceSecs = 5,
): number {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000) -
      toleranceSecs,
  );
  const peak = PEAK_ODDS[type] ?? { oui: 1.30, non: 2.00 };
  return decayAt(option === "oui" ? peak.oui : peak.non, elapsed);
}
