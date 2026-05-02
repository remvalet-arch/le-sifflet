import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { runInitialSync } from "@/services/sportsdb-sync";

/**
 * GET /api/admin/trigger-initial-sync
 * Lance l'ingestion TheSportsDB (Ligue 1 + équipes VIP) — réservé aux modérateurs.
 * Query : `?rosters=1` pour enchaîner la sync de tous les effectifs `players` (long, ~100 req/min à respecter).
 */
export async function GET(request: NextRequest) {
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

  const rosters = request.nextUrl.searchParams.get("rosters") === "1";

  try {
    const summary = await runInitialSync({ rosters });
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
