import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isAdminRole } from "@/lib/constants/permissions";
import { syncUpcomingMatches } from "@/services/sportsdb-sync";

/**
 * GET /api/admin/sync-matches
 * Phase 2 ingestion : prochains matchs TheSportsDB → `public.matches` (modérateurs uniquement).
 */
export async function GET() {
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

  try {
    const summary = await syncUpcomingMatches();
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
