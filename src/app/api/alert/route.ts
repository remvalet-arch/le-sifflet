import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { AlertActionType } from "@/types/database";

const VALID_TYPES: AlertActionType[] = [
  "penalty_check",
  "penalty_outcome",
  "var_goal",
  "red_card",
  "injury_sub",
];
const ALERT_THRESHOLD = 2;
const ALERT_WINDOW_SECONDS = 30;
const COOLDOWN_MINUTES = 3;
const MIN_TRUST_SCORE = 50;

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

  if ((profile?.trust_score ?? 0) < MIN_TRUST_SCORE) {
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
    console.error("[alert] Échec insert alert_signal:", insertError.message);
    return errorResponse(insertError.message);
  }

  // Compte les signaux DISTINCTS (utilisateurs différents) dans la fenêtre de 30s
  const since = new Date(Date.now() - ALERT_WINDOW_SECONDS * 1000).toISOString();
  const { data: recentSignals, error: signalsError } = await supabase
    .from("alert_signals")
    .select("user_id")
    .eq("match_id", match_id)
    .eq("action_type", validType)
    .gte("created_at", since);

  if (signalsError) {
    console.error("[alert] Échec fetch alert_signals:", signalsError.message);
    return errorResponse(signalsError.message);
  }

  const distinctUsers = [...new Set((recentSignals ?? []).map((s) => s.user_id))];
  const distinctCount = distinctUsers.length;

  console.log(
    `[alert] match=${match_id} type=${validType} distinct=${distinctCount} threshold=${ALERT_THRESHOLD}`,
  );

  let cooldown_until: string | null = null;

  if (distinctCount >= ALERT_THRESHOLD) {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error("[alert] createAdminClient failed:", e);
      return errorResponse(
        "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)",
        500,
      );
    }

    // Vérifie qu'il n'y a pas déjà un event 'open' du même type
    const { data: existing } = await admin
      .from("market_events")
      .select("id")
      .eq("match_id", match_id)
      .eq("type", validType)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return successResponse({ cooldown_until: null });
    }

    const { error: eventError } = await admin.from("market_events").insert({
      match_id,
      type: validType,
      status: "open",
      initiators: distinctUsers,
    });

    if (eventError) {
      console.error("[alert] Échec insert market_event:", eventError.message);
      return errorResponse("Impossible de créer l'événement");
    }
    console.log(
      `[alert] ✅ market_event créé — match=${match_id} type=${validType} initiators=${distinctUsers.length}`,
    );

    cooldown_until = new Date(
      Date.now() + COOLDOWN_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: cooldownError } = await admin
      .from("matches")
      .update({ alert_cooldown_until: cooldown_until })
      .eq("id", match_id);

    if (cooldownError) {
      console.error("[alert] Échec update cooldown:", cooldownError.message);
    }
    console.log(`[alert] ✅ cooldown posé jusqu'à ${cooldown_until}`);
  }

  return successResponse({ cooldown_until });
}
