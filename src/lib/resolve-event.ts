import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketEventType } from "@/types/database";

// Effet Domino — quand un événement est validé (OUI), déclenche le suivant
const CHAIN_MAP: Partial<Record<MarketEventType, MarketEventType>> = {
  penalty_check: "penalty_outcome",
};

export async function resolveEvent(
  eventId: string,
  result: "oui" | "non",
): Promise<{
  winners: number;
  total_paid: number;
  multiplier: number;
  braquage_squads: number;
}> {
  const admin = createAdminClient();

  // Récupère le type et le match avant résolution (pour le chaining)
  const { data: event } = await admin
    .from("market_events")
    .select("type, match_id")
    .eq("id", eventId)
    .single();

  const { data, error } = await admin.rpc("resolve_event_parimutuel", {
    p_event_id: eventId,
    p_result: result,
  });
  if (error) throw new Error(error.message);

  // Annule le cooldown VAR du match pour permettre une nouvelle alerte immédiate
  if (event) {
    const { error: cooldownErr } = await admin
      .from("matches")
      .update({ alert_cooldown_until: null })
      .eq("id", event.match_id);
    if (cooldownErr) {
      console.error("[resolve] Reset cooldown failed:", cooldownErr.message);
    }
  }

  // ── Effet Domino ─────────────────────────────────────────────────────────────
  if (event && result === "oui") {
    const chainType = CHAIN_MAP[event.type as MarketEventType];
    if (chainType) {
      // Vérifie qu'aucun event du même type n'est déjà ouvert
      const { data: existing } = await admin
        .from("market_events")
        .select("id")
        .eq("match_id", event.match_id)
        .eq("type", chainType)
        .in("status", ["open", "closed"])
        .maybeSingle();

      if (!existing) {
        admin
          .from("market_events")
          .insert({
            match_id: event.match_id,
            type: chainType,
            status: "open",
            initiators: [],
          })
          .then(({ error: chainErr }) => {
            if (chainErr)
              console.error("[resolve] Chain event failed:", chainErr.message);
          });
      }
    }
  }

  return data as {
    winners: number;
    total_paid: number;
    multiplier: number;
    braquage_squads: number;
  };
}
