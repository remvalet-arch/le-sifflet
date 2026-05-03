import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

/** Tolérance sur la cote implicite (arrondis + léger décalage réseau). */
const IMPLIED_ODDS_TOLERANCE = 0.03;

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
    .select("status")
    .eq("id", event_id)
    .maybeSingle();

  if (!event || event.status !== "open") {
    return errorResponse("Les prédictions sont closes", 400);
  }

  const { data: oddsRows, error: oddsErr } = await supabase.rpc("get_event_odds", {
    p_event_id: event_id,
  });

  if (oddsErr || !oddsRows?.length) {
    return errorResponse("Impossible de lire les cotes du marché", 500);
  }

  const row = oddsRows.find((r) => r.option === chosen_option);
  const implied = Number(row?.implied_multiplier ?? 0);
  if (!Number.isFinite(implied) || implied < 1) {
    return errorResponse("Cote marché invalide", 500);
  }

  if (multiplier > implied + IMPLIED_ODDS_TOLERANCE) {
    return errorResponse("Multiplicateur invalide — la cote a bougé, réessaie", 400);
  }

  const validatedMultiplier = Math.min(multiplier, implied);

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
