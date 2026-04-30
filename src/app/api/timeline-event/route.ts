import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { TimelineEventType } from "@/types/database";

const VALID_TYPES = ["goal", "yellow_card", "red_card", "substitution"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score <= 150) {
    return errorResponse("Accès réservé aux modérateurs (score ≥ 150)", 403);
  }

  const body = (await request.json()) as {
    match_id?: string;
    event_type?: string;
    minute?: unknown;
    team_side?: string;
    player_name?: string;
  };

  const { match_id, event_type, minute, team_side, player_name } = body;

  if (!match_id || !event_type || !team_side || !player_name) {
    return errorResponse("Paramètres manquants", 400);
  }
  if (!VALID_TYPES.includes(event_type)) {
    return errorResponse("Type d'événement invalide", 400);
  }
  if (!["home", "away"].includes(team_side)) {
    return errorResponse("Équipe invalide", 400);
  }
  if (
    typeof minute !== "number" ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 120
  ) {
    return errorResponse("Minute invalide (0–120)", 400);
  }
  if (typeof player_name !== "string" || player_name.trim().length === 0) {
    return errorResponse("Nom du joueur manquant", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("match_timeline_events")
    .insert({
      match_id,
      event_type: event_type as TimelineEventType,
      minute,
      team_side: team_side as "home" | "away",
      player_name: player_name.trim(),
    })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data);
}
