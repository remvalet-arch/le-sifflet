import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";

const VAR_ALERT_COOLDOWN_MINUTES = 15;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as { match_id?: string };
  if (!body.match_id) return errorResponse("match_id requis", 400);
  const { match_id } = body;

  const admin = createAdminClient();

  // Cooldown par utilisateur (15 min)
  const since = new Date(
    Date.now() - VAR_ALERT_COOLDOWN_MINUTES * 60 * 1000,
  ).toISOString();
  const { data: recent } = await admin
    .from("squad_nudge_logs")
    .select("sent_at")
    .eq("sent_by", user.id)
    .eq("nudge_type", "var_alert")
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    const remaining = Math.ceil(
      (new Date(recent.sent_at).getTime() +
        VAR_ALERT_COOLDOWN_MINUTES * 60 * 1000 -
        Date.now()) /
        60000,
    );
    return errorResponse(
      `Sirène VAR déjà utilisée récemment. Réessaie dans ${remaining} min.`,
      429,
    );
  }

  // Squads de l'utilisateur
  const { data: memberships } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("user_id", user.id);

  const squadIds = (memberships ?? []).map((m) => m.squad_id);
  if (squadIds.length === 0) return successResponse({ sent_count: 0 });

  // Tous les membres de ces squads (sauf soi-même)
  const { data: allMembers } = await admin
    .from("squad_members")
    .select("user_id")
    .in("squad_id", squadIds)
    .neq("user_id", user.id);

  const targetIds = [...new Set((allMembers ?? []).map((m) => m.user_id))];
  if (targetIds.length === 0) return successResponse({ sent_count: 0 });

  // Username + infos du match
  const [{ data: profile }, { data: match }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase
      .from("matches")
      .select("team_home, team_away")
      .eq("id", match_id)
      .single(),
  ]);

  const senderName = profile?.username ?? "Quelqu'un";
  const matchLabel = match
    ? `${match.team_home} – ${match.team_away}`
    : "un match";

  const sentCount = await sendPushToUsers(targetIds, {
    title: `🚨 Sirène VAR — ${senderName} t'appelle !`,
    body: `Rejoins ${senderName} sur VAR Time pour ${matchLabel} !`,
    url: `/match/${match_id}`,
  });

  // Logger (squad_id nullable pour un var-alert utilisateur)
  await admin.from("squad_nudge_logs").insert({
    squad_id: squadIds[0] ?? null,
    sent_by: user.id,
    nudge_type: "var_alert",
  });

  return successResponse({ sent_count: sentCount });
}
