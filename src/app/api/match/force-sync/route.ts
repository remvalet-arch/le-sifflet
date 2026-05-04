import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { syncApiFootballMatch } from "@/services/api-football-sync";

/**
 * POST /api/match/force-sync
 * Body: { matchId: string }
 *
 * Déclenché par le client quand un match terminé n'a pas encore de stats/events synchronisés.
 * Appelle syncApiFootballMatch côté serveur et retourne le résumé.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  let matchId: string;
  try {
    const body = (await request.json()) as { matchId?: unknown };
    if (typeof body.matchId !== "string" || body.matchId.trim() === "") {
      return errorResponse("matchId requis", 400);
    }
    matchId = body.matchId.trim();
  } catch {
    return errorResponse("Corps JSON invalide", 400);
  }

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey || apiKey === "undefined") {
    return errorResponse("API_FOOTBALL_KEY manquante", 500);
  }

  try {
    const result = await syncApiFootballMatch(matchId);
    return successResponse(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
