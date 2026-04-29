import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { AlertActionType } from "@/types/database";

const VALID_TYPES: AlertActionType[] = ["penalty", "offside", "card"];
const THRESHOLD = 1; // TEST : seuil abaissé à 1 pour valider la chaîne Realtime
const WINDOW_SECONDS = 15;
const COOLDOWN_MINUTES = 3;

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

  if (!match_id || !action_type || !VALID_TYPES.includes(action_type as AlertActionType)) {
    return errorResponse("Paramètres invalides", 400);
  }

  const validType = action_type as AlertActionType;

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

  // Enregistre le signal (client user : INSERT policy OK)
  const { error: insertError } = await supabase.from("alert_signals").insert({
    match_id,
    user_id: user.id,
    action_type: validType,
  });

  if (insertError) {
    console.error("[alert] Échec insert alert_signal:", insertError.message);
    return errorResponse(insertError.message);
  }

  // Compte les signaux dans la fenêtre de temps
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("alert_signals")
    .select("*", { count: "exact", head: true })
    .eq("match_id", match_id)
    .eq("action_type", validType)
    .gte("created_at", since);

  if (countError) {
    console.error("[alert] Échec count alert_signals:", countError.message);
    return errorResponse(countError.message);
  }

  console.log(`[alert] match=${match_id} type=${validType} count=${count ?? 0} threshold=${THRESHOLD}`);

  let cooldown_until: string | null = null;

  if ((count ?? 0) >= THRESHOLD) {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error("[alert] createAdminClient failed:", e);
      return errorResponse("Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)", 500);
    }

    const { error: eventError } = await admin.from("market_events").insert({
      match_id,
      type: validType,
      status: "open",
    });

    if (eventError) {
      console.error("[alert] Échec insert market_event:", eventError.message);
      return errorResponse("Impossible de créer l'événement");
    }
    console.log(`[alert] ✅ market_event créé — match=${match_id} type=${validType}`);

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
