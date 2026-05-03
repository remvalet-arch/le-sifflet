import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { maxAllowedMultiplier } from "@/lib/constants/odds";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as {
    event_id?: string;
    chosen_option?: string;
    amount_staked?: unknown;
    multiplier?: unknown;
    squad_id?: string | null;
  };

  const { event_id, chosen_option, amount_staked, multiplier, squad_id } = body;

  if (!event_id || !chosen_option) {
    return errorResponse("Paramètres manquants", 400);
  }

  if (!["oui", "non"].includes(chosen_option)) {
    return errorResponse("Vote invalide", 400);
  }

  if (
    typeof amount_staked !== "number" ||
    !Number.isInteger(amount_staked) ||
    amount_staked < 10
  ) {
    return errorResponse("Mise invalide (min. 10 Pts)", 400);
  }

  if (typeof multiplier !== "number" || multiplier < 1.0) {
    return errorResponse("Multiplicateur invalide", 400);
  }

  const { data: event } = await supabase
    .from("market_events")
    .select("type, created_at, status")
    .eq("id", event_id)
    .maybeSingle();

  if (!event || event.status !== "open") {
    return errorResponse("Les prédictions sont closes", 400);
  }

  const maxMulti = maxAllowedMultiplier(
    event.type,
    event.created_at,
    chosen_option as "oui" | "non",
  );

  // Reject if client claimed a multiplier more than 0.01 above server max
  // (the 5s tolerance in maxAllowedMultiplier already covers network latency)
  if (multiplier > maxMulti + 0.01) {
    return errorResponse("Multiplicateur invalide — cote expirée", 400);
  }

  const validatedMultiplier = Math.min(multiplier, maxMulti);

  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_event_id: event_id,
    p_chosen_option: chosen_option,
    p_amount_staked: amount_staked,
    p_multiplier: validatedMultiplier,
    p_squad_id: squad_id ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_squad_member"))
      return errorResponse("Tu n’es pas membre de cette ligue", 403);
    if (msg.includes("event_not_open"))
      return errorResponse("Les prédictions sont closes", 400);
    if (msg.includes("event_expired"))
      return errorResponse("Le temps de vote est écoulé", 400);
    if (msg.includes("insufficient_balance"))
      return errorResponse("Solde insuffisant", 400);
    if (msg.includes("invalid_amount"))
      return errorResponse("Mise invalide (min. 10 Pts)", 400);
    if (msg.includes("invalid_multiplier"))
      return errorResponse("Multiplicateur invalide", 400);
    if (msg.includes("unauthorized"))
      return errorResponse("Non autorisé", 401);
    return errorResponse(msg);
  }

  return successResponse({ bet_id: betId });
}
