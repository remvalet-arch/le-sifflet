import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";

const NUDGE_COOLDOWN_MINUTES = 30;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as { squad_id?: string };
  if (!body.squad_id) return errorResponse("squad_id requis", 400);
  const { squad_id } = body;

  // Vérifier que l'utilisateur est membre
  const { data: membership } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("squad_id", squad_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership)
    return errorResponse("Tu n'es pas membre de cette ligue", 403);

  const admin = createAdminClient();

  // Vérifier le cooldown (30 min par squad)
  const since = new Date(
    Date.now() - NUDGE_COOLDOWN_MINUTES * 60 * 1000,
  ).toISOString();
  const { data: recent } = await admin
    .from("squad_nudge_logs")
    .select("sent_at")
    .eq("squad_id", squad_id)
    .eq("nudge_type", "prono")
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    const remaining = Math.ceil(
      (new Date(recent.sent_at).getTime() +
        NUDGE_COOLDOWN_MINUTES * 60 * 1000 -
        Date.now()) /
        60000,
    );
    return errorResponse(
      `Un nudge a déjà été envoyé récemment. Réessaie dans ${remaining} min.`,
      429,
    );
  }

  // Récupérer les membres de la squad (sauf soi-même)
  const { data: members } = await admin
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squad_id)
    .neq("user_id", user.id);

  if (!members?.length) return successResponse({ sent_count: 0 });

  const memberIds = members.map((m) => m.user_id);

  // Trouver les membres sans prono sur les matchs des prochaines 24h
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: upcomingMatches } = await admin
    .from("matches")
    .select("id")
    .eq("status", "upcoming")
    .lte("start_time", in24h);

  const matchIds = (upcomingMatches ?? []).map((m) => m.id);

  let targetIds: string[] = memberIds;

  if (matchIds.length > 0) {
    // Membres qui ont déjà pronostiqué au moins un match à venir
    const { data: pronoed } = await admin
      .from("pronos")
      .select("user_id")
      .in("user_id", memberIds)
      .in("match_id", matchIds)
      .eq("prono_type", "exact_score");

    const pronedSet = new Set((pronoed ?? []).map((p) => p.user_id));
    const unpronoed = memberIds.filter((id) => !pronedSet.has(id));
    targetIds = unpronoed.length > 0 ? unpronoed : memberIds;
  }

  // Récupérer le username de l'expéditeur
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const senderName = senderProfile?.username ?? "Quelqu'un";

  // Envoyer les push
  const sentCount = await sendPushToUsers(targetIds, {
    title: "VAR Time — Pronos en attente 🎯",
    body: `${senderName} attend tes pronos ! Les matchs approchent.`,
    url: "/pronos",
  });

  // Logger le nudge
  await admin.from("squad_nudge_logs").insert({
    squad_id,
    sent_by: user.id,
    nudge_type: "prono",
  });

  return successResponse({ sent_count: sentCount });
}
