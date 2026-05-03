import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { isLobbyTrackedLeagueApiId } from "@/lib/constants/top-leagues";
import { syncApiFootballFixturesByRound } from "@/services/api-football-fixtures-import";

/**
 * GET /api/admin/sync-apifootball-round?leagueId=61&roundName=Regular%20Season%20-%2034
 * Import API-Football d’une journée complète (`round`) pour une ligue — modérateurs uniquement.
 */
export async function GET(request: Request) {
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

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès réservé aux modérateurs", 403);
  }

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (apiKey === undefined || apiKey === "" || apiKey === "undefined") {
    return errorResponse("API_FOOTBALL_KEY manquante ou vide", 500);
  }

  const url = new URL(request.url);
  const leagueRaw = url.searchParams.get("leagueId")?.trim() ?? "";
  const roundRaw = url.searchParams.get("roundName")?.trim() ?? "";
  const leagueId = parseInt(leagueRaw, 10);
  if (Number.isNaN(leagueId) || leagueId <= 0) {
    return errorResponse("Paramètre leagueId obligatoire (nombre), ex. ?leagueId=61", 400);
  }
  if (!isLobbyTrackedLeagueApiId(leagueId)) {
    return errorResponse("leagueId doit être une ligue suivie au lobby (Top 5 + coupes UEFA).", 400);
  }
  if (roundRaw === "") {
    return errorResponse(
      "Paramètre roundName obligatoire (libellé API-Football), ex. ?roundName=Regular Season - 34",
      400,
    );
  }

  try {
    const summary = await syncApiFootballFixturesByRound(leagueId, roundRaw);
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
