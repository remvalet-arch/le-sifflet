import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyEventWithAPI } from "@/lib/sports/sportsProvider";
import { resolveEvent } from "@/lib/resolve-event";

const MIN_AGE_SECONDS = 3 * 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const body = (await request.json()) as { event_id?: string };
  if (!body.event_id) return errorResponse("event_id requis", 400);

  const { data: event } = await supabase
    .from("market_events")
    .select("*")
    .eq("id", body.event_id)
    .eq("status", "open")
    .single();

  if (!event) return errorResponse("Événement introuvable ou déjà résolu", 404);

  const ageSeconds =
    (Date.now() - new Date(event.created_at).getTime()) / 1000;

  if (ageSeconds < MIN_AGE_SECONDS) {
    return successResponse({
      status: "too_early",
      age_seconds: Math.round(ageSeconds),
    });
  }

  const apiResult = await verifyEventWithAPI();

  if (apiResult === "WAIT") {
    return successResponse({ status: "waiting" });
  }

  const result = apiResult === "SUCCESS" ? "oui" : "non";

  try {
    await resolveEvent(body.event_id, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg);
  }

  return successResponse({ status: "resolved", result });
}
