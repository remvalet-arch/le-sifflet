import type { MarketEventType } from "@/types/database";
import { fetchFixtureEventsRaw } from "@/services/api-football-sync";
import { latestMarketVerdictFromFixtureEvents } from "@/lib/sports/api-football-market-bridge";

export type VerifyResult = "SUCCESS" | "FAILURE" | "WAIT";

/** Types supportés par la résolution automatique via API-Football. */
const AUTO_RESOLVE_TYPES: MarketEventType[] = [
  "var_goal",
  "penalty_check",
  "red_card",
  "penalty_outcome",
  "corner",
  "free_kick",
];

/**
 * Interroge API-Football (incidents `fixtures/events`) pour les marchés
 * auto-résolvables. Les autres types (stoppage_ht, stoppage_ft) retournent
 * `WAIT` (résolution manuelle admin).
 */
export async function verifyMarketEventWithApiFootball(params: {
  matchId: string;
  marketType: MarketEventType;
  marketCreatedAt?: string;
}): Promise<VerifyResult> {
  const { matchId, marketType, marketCreatedAt } = params;

  if (!AUTO_RESOLVE_TYPES.includes(marketType)) {
    return "WAIT";
  }

  const pack = await fetchFixtureEventsRaw(matchId);
  if (!pack?.events.length) return "WAIT";

  const verdict = latestMarketVerdictFromFixtureEvents(
    marketType,
    pack.events,
    marketCreatedAt,
  );
  if (verdict === "WAIT") return "WAIT";
  return verdict === "oui" ? "SUCCESS" : "FAILURE";
}
