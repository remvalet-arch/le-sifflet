import { createAdminClient } from "@/lib/supabase/admin";
import { fetchApiFootball } from "@/lib/api-football-client";
import { log } from "@/lib/logger";

type OddValue = { value: string; odd: string };
type Bet = { name: string; values: OddValue[] };
type Bookmaker = { id: number; bets: Bet[] };
type OddsResponse = { response: Array<{ bookmakers: Bookmaker[] }> };

const SCORER_MARKETS = [
  { key: "odd_first", label: "first goal scorer" },
  { key: "odd_anytime", label: "anytime score" },
] as const;

/**
 * Fetches First Goal Scorer + Anytime Score odds from API-Football for a
 * given fixture and upserts them into `player_odds`.
 * Returns the number of player rows upserted, or 0 if no odds found.
 */
export async function syncPlayerOddsForMatch(
  matchId: string,
  fixtureId: number,
): Promise<number> {
  const data = await fetchApiFootball<OddsResponse>("odds", {
    fixture: String(fixtureId),
    bookmaker: "8", // Bet365
  });

  const bookmakers = data.response?.[0]?.bookmakers ?? [];

  const oddsMap = new Map<
    string,
    { odd_first?: number; odd_anytime?: number }
  >();

  for (const bm of bookmakers) {
    for (const { key, label } of SCORER_MARKETS) {
      const bet = bm.bets.find((b) => b.name.toLowerCase().includes(label));
      if (!bet) continue;
      for (const { value: playerName, odd } of bet.values) {
        const parsed = parseFloat(odd);
        if (!Number.isFinite(parsed) || parsed < 1) continue;
        const existing = oddsMap.get(playerName) ?? {};
        oddsMap.set(playerName, { ...existing, [key]: parsed });
      }
    }
  }

  if (oddsMap.size === 0) {
    log.info(
      "odds-sync",
      `No scorer odds found for fixture=${String(fixtureId)}`,
    );
    return 0;
  }

  const admin = createAdminClient();
  const rows = Array.from(oddsMap.entries()).map(([player_name, odds]) => ({
    match_id: matchId,
    player_name,
    odd_first: odds.odd_first ?? null,
    odd_anytime: odds.odd_anytime ?? null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("player_odds")
    .upsert(rows, { onConflict: "match_id,player_name" });

  if (error) {
    log.error("odds-sync", "Upsert player_odds failed", error.message);
    throw new Error(error.message);
  }

  log.info(
    "odds-sync",
    `Upserted ${String(rows.length)} player odds for match=${matchId}`,
  );
  return rows.length;
}
