import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

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
  };

  const { event_id, chosen_option, amount_staked } = body;

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
    return errorResponse("Mise invalide (min. 10 Sifflets)", 400);
  }

  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_event_id: event_id,
    p_chosen_option: chosen_option,
    p_amount_staked: amount_staked,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("event_not_open"))
      return errorResponse("Les paris sont clos", 400);
    if (msg.includes("event_expired"))
      return errorResponse("Le temps de vote est écoulé", 400);
    if (msg.includes("insufficient_balance"))
      return errorResponse("Solde insuffisant", 400);
    if (msg.includes("invalid_amount"))
      return errorResponse("Mise invalide (min. 10 Sifflets)", 400);
    if (msg.includes("unauthorized"))
      return errorResponse("Non autorisé", 401);
    return errorResponse(msg);
  }

  return successResponse({ bet_id: betId });
}
