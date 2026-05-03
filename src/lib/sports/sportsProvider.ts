import type { MarketEventType } from "@/types/database";
import { fetchFixtureEventsRaw } from "@/services/api-football-sync";
import { latestMarketVerdictFromFixtureEvents } from "@/lib/sports/api-football-market-bridge";

export type VerifyResult = "SUCCESS" | "FAILURE" | "WAIT";

/**
 * Interroge API-Football (incidents `fixtures/events`) pour les marchés
 * `var_goal` et `penalty_check`. Les autres types retournent `WAIT`
 * (résolution manuelle admin).
 */
export async function verifyMarketEventWithApiFootball(params: {
  matchId: string;
  marketType: MarketEventType;
}): Promise<VerifyResult> {
  const { matchId, marketType } = params;

  if (marketType !== "var_goal" && marketType !== "penalty_check") {
    return "WAIT";
  }

  const pack = await fetchFixtureEventsRaw(matchId);
  if (!pack?.events.length) return "WAIT";

  const verdict = latestMarketVerdictFromFixtureEvents(marketType, pack.events);
  if (verdict === "WAIT") return "WAIT";
  return verdict === "oui" ? "SUCCESS" : "FAILURE";
}
