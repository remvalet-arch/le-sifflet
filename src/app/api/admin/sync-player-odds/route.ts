import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { syncPlayerOddsForMatch } from "@/services/api-football-odds-sync";
import { isAdminRole } from "@/lib/constants/permissions";

/**
 * POST /api/admin/sync-player-odds
 * Body: { match_id: string }
 *
 * Fetches scorer odds from API-Football for the given match and stores
 * them in `player_odds`. Requires api_football_id on the match row.
 */
export async function POST(request: Request) {
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

  const body = (await request.json()) as { match_id?: string };
  const { match_id } = body;
  if (!match_id) return errorResponse("match_id requis", 400);

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("api_football_id, team_home, team_away")
    .eq("id", match_id)
    .single();

  if (!match) return errorResponse("Match introuvable", 404);
  if (!match.api_football_id) {
    return errorResponse("Ce match n'a pas d'api_football_id", 422);
  }

  try {
    const count = await syncPlayerOddsForMatch(match_id, match.api_football_id);
    return successResponse({
      match_id,
      match: `${match.team_home} vs ${match.team_away}`,
      players_synced: count,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
