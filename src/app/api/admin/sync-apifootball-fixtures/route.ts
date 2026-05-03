import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { syncApiFootballFixturesForDate } from "@/services/api-football-fixtures-import";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/sync-apifootball-fixtures?date=YYYY-MM-DD
 * Import des matchs **Top 5** (API-Football) pour une journée — modérateurs uniquement.
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
  const date = url.searchParams.get("date")?.trim() ?? "";
  if (!YMD.test(date)) {
    return errorResponse("Paramètre date obligatoire (YYYY-MM-DD), ex. ?date=2026-05-03", 400);
  }

  try {
    const summary = await syncApiFootballFixturesForDate(date);
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
