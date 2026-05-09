import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { AlertActionType } from "@/types/database";
import { sendPushToMatchSubscribers } from "@/lib/push-sender";
import { log } from "@/lib/logger";
import {
  ALERT_WINDOW_SECONDS,
  COOLDOWN_MINUTES,
  MIN_TRUST_ALERT_SCORE,
  getRequiredSignals,
} from "@/lib/constants/alert";

const ACTION_LABELS: Record<AlertActionType, string> = {
  penalty_check: "Penalty en discussion",
  penalty_outcome: "Résultat penalty",
  var_goal: "But sous VAR",
  red_card: "Carton rouge",
  free_kick: "Coup franc dangereux",
  corner: "Corner",
};

const VALID_TYPES: AlertActionType[] = [
  "penalty_check",
  "penalty_outcome",
  "var_goal",
  "red_card",
  "free_kick",
  "corner",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as {
    match_id?: string;
    action_type?: string;
  };
  const { match_id, action_type } = body;

  if (
    !match_id ||
    !action_type ||
    !VALID_TYPES.includes(action_type as AlertActionType)
  ) {
    return errorResponse("Paramètres invalides", 400);
  }

  const validType = action_type as AlertActionType;

  // Vérifie trust_score (anti-troll) — succès silencieux si insuffisant
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if ((profile?.trust_score ?? 0) < MIN_TRUST_ALERT_SCORE) {
    return successResponse({ cooldown_until: null });
  }

  // Rate limiting : max 5 alertes par minute (silencieux — pas de message d'erreur exposé)
  const { count: recentAlertCount } = await supabase
    .from("alert_signals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recentAlertCount ?? 0) >= 5) {
    return successResponse({ cooldown_until: null });
  }

  // Vérifie si le match est en cooldown
  const { data: match } = await supabase
    .from("matches")
    .select("alert_cooldown_until")
    .eq("id", match_id)
    .single();

  if (
    match?.alert_cooldown_until &&
    new Date(match.alert_cooldown_until) > new Date()
  ) {
    return errorResponse("Doucement l'arbitre, attends un peu…", 429);
  }

  // Enregistre le signal
  const { error: insertError } = await supabase.from("alert_signals").insert({
    match_id,
    user_id: user.id,
    action_type: validType,
  });

  if (insertError) {
    log.error("alert", "Échec insert alert_signal", insertError.message);
    return errorResponse(insertError.message);
  }

  // Compte les signaux DISTINCTS (utilisateurs différents) dans la fenêtre de 30s
  const since = new Date(
    Date.now() - ALERT_WINDOW_SECONDS * 1000,
  ).toISOString();
  const { data: recentSignals, error: signalsError } = await supabase
    .from("alert_signals")
    .select("user_id")
    .eq("match_id", match_id)
    .eq("action_type", validType)
    .gte("created_at", since);

  if (signalsError) {
    log.error("alert", "Échec fetch alert_signals", signalsError.message);
    return errorResponse(signalsError.message);
  }

  const distinctUsers = [
    ...new Set((recentSignals ?? []).map((s) => s.user_id)),
  ];
  const distinctCount = distinctUsers.length;

  // Seuil dynamique basé sur l'audience active (Sprint Q)
  const { data: audienceData } = await supabase.rpc(
    "count_active_users_on_match",
    { p_match_id: match_id, p_window_minutes: 5 },
  );
  const audienceCount = (audienceData as number | null) ?? 0;
  const requiredSignals = getRequiredSignals(audienceCount);

  log.info(
    "alert",
    `match=${match_id} type=${validType} audience=${audienceCount} seuil=${requiredSignals} signals=${distinctCount}`,
  );

  let cooldown_until: string | null = null;

  if (distinctCount >= requiredSignals) {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (e) {
      log.error("alert", "createAdminClient failed", e);
      return errorResponse(
        "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)",
        500,
      );
    }

    // Vérifie qu'il n'y a pas déjà un event ouvert ou fermé en attente de verdict
    const { data: existing } = await admin
      .from("market_events")
      .select("id")
      .eq("match_id", match_id)
      .eq("type", validType)
      .in("status", ["open", "closed"])
      .maybeSingle();

    if (existing) {
      return successResponse({ cooldown_until: null });
    }

    const { data: newEvent, error: eventError } = await admin
      .from("market_events")
      .insert({
        match_id,
        type: validType,
        status: "open",
        initiators: distinctUsers,
      })
      .select("id")
      .single();

    if (eventError) {
      log.error("alert", "Échec insert market_event", eventError.message);
      return errorResponse("Impossible de créer l'événement");
    }
    log.info(
      "alert",
      `market_event créé match=${match_id} type=${validType} initiators=${distinctUsers.length}`,
    );

    const marketEventId = newEvent.id;

    // Fire-and-forget : push aux abonnés du match — exclut les initiateurs
    // (ils sont déjà sur la page match et ont déclenché l'alerte eux-mêmes)
    void sendPushToMatchSubscribers(
      match_id,
      {
        title: "VAR Time 🟨",
        body: `${ACTION_LABELS[validType]} — le marché vient d'ouvrir, parie !`,
        url: `/match/${match_id}`,
        actions: [
          { action: "bet_yes", title: "✅ OUI" },
          { action: "bet_no", title: "❌ NON" },
        ],
        tag: `var-${marketEventId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 400],
        extra_data: { marketEventId, matchId: match_id, type: "var_alert" },
      },
      distinctUsers,
    ).catch((e: unknown) => log.error("alert", "push failed", e));

    cooldown_until = new Date(
      Date.now() + COOLDOWN_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: cooldownError } = await admin
      .from("matches")
      .update({ alert_cooldown_until: cooldown_until })
      .eq("id", match_id);

    if (cooldownError) {
      log.warn("alert", "Échec update cooldown", cooldownError.message);
    }
    log.info("alert", `cooldown posé jusqu'à ${cooldown_until}`);
  }

  return successResponse({
    cooldown_until,
    current_signals: distinctCount,
    required_signals: requiredSignals,
    market_opened: distinctCount >= requiredSignals,
  });
}
