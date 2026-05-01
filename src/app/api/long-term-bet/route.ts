import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as {
    match_id?: string;
    bet_type?: string;
    bet_value?: string;
    amount_staked?: unknown;
    potential_reward?: unknown;
  };

  const { match_id, bet_type, bet_value, amount_staked, potential_reward } = body;

  if (!match_id || !bet_type || !bet_value) {
    return errorResponse("Paramètres manquants", 400);
  }
  if (!["scorer", "exact_score"].includes(bet_type)) {
    return errorResponse("Type de prédiction invalide", 400);
  }
  if (typeof amount_staked !== "number" || amount_staked < 10) {
    return errorResponse("Mise minimum : 10 Pts", 400);
  }
  if (typeof potential_reward !== "number" || potential_reward <= 0) {
    return errorResponse("Récompense potentielle invalide", 400);
  }

  // Vérifie que le match n'est pas terminé
  const { data: match } = await supabase
    .from("matches")
    .select("status")
    .eq("id", match_id)
    .single();

  if (!match || match.status === "finished") {
    return errorResponse("Le match est terminé, les prédictions sont fermées", 400);
  }

  // RPC atomique : débite le solde + insère le pari
  const { data: betId, error } = await supabase.rpc("place_long_term_bet", {
    p_match_id:         match_id,
    p_bet_type:         bet_type,
    p_bet_value:        bet_value,
    p_amount_staked:    amount_staked,
    p_potential_reward: potential_reward,
  });

  if (error) {
    if (error.message.includes("insuffisant")) return errorResponse("Solde insuffisant", 400);
    if (error.message.includes("unique") || error.code === "23505") {
      return errorResponse("Tu as déjà une prédiction sur cette option", 409);
    }
    return errorResponse(error.message);
  }

  return successResponse({ id: betId });
}
