import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { MatchStatus } from "@/types/database";
import { isAdminRole } from "@/lib/constants/permissions";
import { logAdminAction } from "@/lib/audit";

const VALID_STATUSES: MatchStatus[] = [
  "upcoming",
  "first_half",
  "half_time",
  "second_half",
  "paused",
  "finished",
];

const INFO_DETAILS: Partial<Record<MatchStatus, string>> = {
  first_half: "Coup d'envoi de la première mi-temps",
  half_time: "Mi-temps",
  second_half: "Coup d'envoi de la deuxième mi-temps",
  paused: "Match interrompu",
  finished: "Fin du match",
};

const INFO_MINUTES: Partial<Record<MatchStatus, number>> = {
  first_half: 0,
  half_time: 45,
  second_half: 45,
  paused: 45,
  finished: 90,
};

export async function POST(request: NextRequest) {
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

  const body = (await request.json()) as { match_id?: string; status?: string };
  const { match_id, status } = body;

  if (!match_id) return errorResponse("match_id manquant", 400);
  if (!status || !VALID_STATUSES.includes(status as MatchStatus)) {
    return errorResponse("Statut invalide", 400);
  }

  const newStatus = status as MatchStatus;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("matches")
    .update({ status: newStatus })
    .eq("id", match_id)
    .select()
    .single();

  if (error) return errorResponse(error.message);

  // Insert a timeline 'info' event for this status change (best-effort)
  const details = INFO_DETAILS[newStatus];
  if (details) {
    void admin.from("match_timeline_events").insert({
      match_id,
      event_type: "info",
      minute: INFO_MINUTES[newStatus] ?? 0,
      team_side: "home",
      player_name: "Arbitre",
      is_own_goal: false,
      details,
    });
  }

  void logAdminAction({
    actorUserId: user.id,
    actorRole: profile.role as "user" | "moderator" | "founder",
    actionType: "admin_match_state_update",
    targetResourceType: "match",
    targetResourceId: match_id,
    metadata: { status: newStatus },
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return successResponse(data);
}
