import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { TimelineEventType } from "@/types/database";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

const VALID_TYPES = ["goal", "yellow_card", "red_card", "substitution"];

async function getModerator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { user: null, error: errorResponse("Non authentifié", 401) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return {
      user: null,
      error: errorResponse("Accès réservé aux modérateurs (score ≥ 150)", 403),
    };
  }
  return { user, error: null };
}

// ── POST : créer un événement ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { error } = await getModerator();
  if (error) return error;

  const body = (await request.json()) as {
    match_id?: string;
    event_type?: string;
    minute?: unknown;
    team_side?: string;
    player_name?: string;
    is_own_goal?: boolean;
  };

  const { match_id, event_type, minute, team_side, player_name, is_own_goal } =
    body;

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
  const ownGoal = event_type === "goal" ? (is_own_goal ?? false) : false;

  const { data, error: dbError } = await admin
    .from("match_timeline_events")
    .insert({
      match_id,
      event_type: event_type as TimelineEventType,
      minute,
      team_side: team_side as "home" | "away",
      player_name: player_name.trim(),
      is_own_goal: ownGoal,
    })
    .select()
    .single();

  if (dbError) return errorResponse(dbError.message);

  // ── Sync du score en cas de but ───────────────────────────────────────────
  // But contre son camp : le point va à l'équipe adverse
  if (event_type === "goal") {
    const scoringTeamIsHome = ownGoal
      ? team_side === "away" // CSC domicile → point extérieur
      : team_side === "home"; // But normal domicile → point domicile
    void admin.rpc("increment_match_score", {
      p_match_id: match_id,
      p_home_delta: scoringTeamIsHome ? 1 : 0,
      p_away_delta: scoringTeamIsHome ? 0 : 1,
    });
  }

  return successResponse(data);
}

// ── PATCH : modifier un événement ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const { error } = await getModerator();
  if (error) return error;

  const body = (await request.json()) as {
    event_id?: string;
    event_type?: string;
    minute?: unknown;
    player_name?: string;
    is_own_goal?: boolean;
  };

  const { event_id, event_type, minute, player_name, is_own_goal } = body;

  if (!event_id) return errorResponse("event_id manquant", 400);
  if (event_type && !VALID_TYPES.includes(event_type)) {
    return errorResponse("Type d'événement invalide", 400);
  }
  if (
    minute !== undefined &&
    (typeof minute !== "number" ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 120)
  ) {
    return errorResponse("Minute invalide (0–120)", 400);
  }

  type TimelineUpdate = {
    event_type?: TimelineEventType;
    minute?: number;
    player_name?: string;
    is_own_goal?: boolean;
  };
  const updates: TimelineUpdate = {};
  if (event_type) updates.event_type = event_type as TimelineEventType;
  if (minute !== undefined) updates.minute = minute as number;
  if (player_name) updates.player_name = player_name.trim();
  if (is_own_goal !== undefined) {
    updates.is_own_goal =
      (event_type ?? "goal") === "goal" ? is_own_goal : false;
  }

  if (Object.keys(updates).length === 0)
    return errorResponse("Aucune modification", 400);

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("match_timeline_events")
    .update(updates)
    .eq("id", event_id)
    .select()
    .single();

  if (dbError) return errorResponse(dbError.message);
  return successResponse(data);
}

// ── DELETE : supprimer un événement ──────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { error } = await getModerator();
  if (error) return error;

  const body = (await request.json()) as { event_id?: string };
  if (!body.event_id) return errorResponse("event_id manquant", 400);

  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from("match_timeline_events")
    .delete()
    .eq("id", body.event_id);

  if (dbError) return errorResponse(dbError.message);
  return successResponse({ deleted: body.event_id });
}
