import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as {
    marketEventId?: string;
    vote?: string;
  };
  const { marketEventId, vote } = body;

  if (!marketEventId || !vote || !["oui", "non"].includes(vote)) {
    return errorResponse("Paramètres invalides", 400);
  }

  // Fetch profile for balance + default bet amount
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_var_bet_amount, sifflets_balance")
    .eq("id", user.id)
    .single();

  const amount = profile?.default_var_bet_amount ?? 50;

  if ((profile?.sifflets_balance ?? 0) < amount) {
    return errorResponse("Solde insuffisant", 400);
  }

  // Verify event is still open + grab match_id for the confirmation push
  const { data: event } = await supabase
    .from("market_events")
    .select("id, status, match_id")
    .eq("id", marketEventId)
    .maybeSingle();

  if (!event || event.status !== "open") {
    return errorResponse("Le marché est fermé", 400);
  }

  // Read current parimutuel odds for the multiplier
  const { data: oddsRows, error: oddsErr } = await supabase.rpc(
    "get_event_odds",
    { p_event_id: marketEventId },
  );

  if (oddsErr || !oddsRows?.length) {
    log.error("quick-bet", "Échec fetch odds", oddsErr?.message);
    return errorResponse("Impossible de lire les cotes", 500);
  }

  const row = oddsRows.find((r) => r.option === vote);
  const multiplier = Math.max(Number(row?.implied_multiplier ?? 1), 1);

  // Place the bet atomically
  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_event_id: marketEventId,
    p_chosen_option: vote,
    p_amount_staked: amount,
    p_multiplier: multiplier,
    p_squad_id: null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("insufficient_balance"))
      return errorResponse("Solde insuffisant", 400);
    if (msg.includes("event_not_open") || msg.includes("event_expired"))
      return errorResponse("Le marché est fermé", 400);
    if (msg.includes("duplicate") || msg.includes("unique"))
      return errorResponse("Tu as déjà parié sur ce marché", 400);
    log.error("quick-bet", "place_bet error", msg);
    return errorResponse(msg);
  }

  log.info(
    "quick-bet",
    `user=${user.id} market=${marketEventId} vote=${vote} amount=${amount} bet=${betId}`,
  );

  // Fire-and-forget confirmation push
  const voteLabel = vote === "oui" ? "OUI ✅" : "NON ❌";
  void sendPushToUsers([user.id], {
    title: `Pari ${voteLabel} posé !`,
    body: `${amount} pts misés — attends le verdict de l'arbitre !`,
    url: `/match/${event.match_id}`,
  }).catch((e: unknown) =>
    log.error("quick-bet", "confirmation push failed", e),
  );

  return successResponse({
    bet_id: betId,
    amount,
    vote,
    message: `Pari ${voteLabel} posé avec ${amount} pts.`,
  });
}
