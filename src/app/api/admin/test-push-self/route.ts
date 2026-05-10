import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { isAdminRole } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

const SCENARIOS: Record<
  string,
  { title: string; body: string; url?: string; tag?: string }
> = {
  generic: {
    title: "🔔 Push de test — VAR TIME",
    body: "Le système de notifications fonctionne correctement.",
    url: "/lobby",
    tag: "test-generic",
  },
  match_imminent: {
    title: "🔴 Match imminent !",
    body: "Paris Saint-Germain vs Real Madrid dans 5 min — Mode Stade activé.",
    url: "/lobby",
    tag: "test-imminent",
  },
  reminder_2h: {
    title: "⏰ Match dans 2h",
    body: "PSG vs Real Madrid commence à 21h00. Pose tes pronos avant le coup d'envoi !",
    url: "/pronos",
    tag: "test-reminder-2h",
  },
  var_event: {
    title: "🚨 Événement VAR !",
    body: "Penalty possible pour PSG ! 90 secondes pour voter.",
    url: "/lobby",
    tag: "test-var",
  },
  win: {
    title: "🎉 Pari gagné !",
    body: "Tu as remporté +250 sifflets sur « Penalty OUI » — bien joué !",
    url: "/profile",
    tag: "test-win",
  },
  daily_digest: {
    title: "📋 Récap du jour",
    body: "3 matchs aujourd'hui, 12 pronos à valider. Tes stats : 68% de réussite cette semaine.",
    url: "/pronos",
    tag: "test-digest",
  },
};

/**
 * POST /api/admin/test-push-self
 * Envoie un push de test à l'utilisateur authentifié (rôle moderator ou founder).
 * Body : { scenario: keyof SCENARIOS }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role)) {
    return errorResponse("Accès réservé aux administrateurs", 403);
  }

  let body: { scenario?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const scenario = SCENARIOS[body.scenario ?? "generic"];
  if (!scenario) return errorResponse("Scénario inconnu", 400);

  const admin = createAdminClient();

  // Check subscription exists
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return errorResponse(
      "Aucune subscription push active pour ton compte. Active les notifications dans les paramètres.",
      400,
    );
  }

  const sent = await sendPushToUsers([user.id], scenario);

  return successResponse({
    sent,
    scenario: body.scenario ?? "generic",
    subscriptions: subs.length,
    message:
      sent > 0
        ? "Push envoyé !"
        : "Subscription trouvée mais push échoué (vérifier les clés VAPID).",
  });
}
