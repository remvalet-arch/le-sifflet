import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyMarketEventWithApiFootball } from "@/lib/sports/sportsProvider";
import { resolveEvent } from "@/lib/resolve-event";

const MIN_AGE_SECONDS = 6 * 60;

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
    .select("id, type, match_id, created_at, status")
    .eq("id", body.event_id)
    .in("status", ["open", "closed"])
    .single();

  if (!event) return errorResponse("Événement introuvable ou déjà résolu", 404);

  const ageSeconds = (Date.now() - new Date(event.created_at).getTime()) / 1000;

  if (ageSeconds < MIN_AGE_SECONDS) {
    return successResponse({
      status: "too_early",
      age_seconds: Math.round(ageSeconds),
    });
  }

  const { data: matchRow } = await supabase
    .from("matches")
    .select("api_football_id")
    .eq("id", event.match_id)
    .maybeSingle();

  if (!matchRow?.api_football_id) {
    return successResponse({
      status: "waiting",
      hint: "no_api_football",
    });
  }

  const apiResult = await verifyMarketEventWithApiFootball({
    matchId: event.match_id,
    marketType: event.type,
  });

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
