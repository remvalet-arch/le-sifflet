import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { resolveEvent } from "@/lib/resolve-event";
import { checkAndUnlockBadges } from "@/app/actions/badges";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  // Guard modérateur — vérification stricte côté serveur
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès réservé aux modérateurs", 403);
  }

  const body = (await request.json()) as {
    event_id?: string;
    result?: string;
  };

  if (
    !body.event_id ||
    !body.result ||
    !["oui", "non"].includes(body.result)
  ) {
    return errorResponse("Paramètres invalides", 400);
  }

  try {
    await resolveEvent(body.event_id, body.result as "oui" | "non");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    if (msg.includes("event_not_open"))
      return errorResponse("Événement déjà résolu ou introuvable", 400);
    return errorResponse(msg);
  }

  // Vérification badges pour tous les parieurs sur cet événement (fire-and-forget)
  void (async () => {
    const adminClient = createAdminClient();
    const { data: bets } = await adminClient
      .from("bets")
      .select("user_id")
      .eq("event_id", body.event_id!);
    const uniqueUserIds = [...new Set((bets ?? []).map((b) => b.user_id))];
    await Promise.all(uniqueUserIds.map((uid) => checkAndUnlockBadges(uid)));
  })();

  return successResponse({ resolved: true });
}
