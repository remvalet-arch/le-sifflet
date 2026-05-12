import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { event_id?: string };
  const eventId = body.event_id;

  if (!eventId || typeof eventId !== "string") {
    return errorResponse("event_id requis", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data, error } = await supabase.rpc("activate_vision_booster", {
    p_event_id: eventId,
  });

  if (error) {
    if (error.message?.includes("no_booster_available")) {
      return errorResponse("Tu n'as pas de booster Vision disponible", 400);
    }
    if (error.message?.includes("event_not_open")) {
      return errorResponse("Ce market n'est plus ouvert", 400);
    }
    if (error.message?.includes("event_not_found")) {
      return errorResponse("Market introuvable", 404);
    }
    log.error("activate_vision", "RPC failed", {
      error: error.message,
      eventId,
    });
    return errorResponse("Erreur serveur", 500);
  }

  return successResponse(data);
}
