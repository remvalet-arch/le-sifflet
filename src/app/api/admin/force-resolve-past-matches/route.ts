import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/force-resolve-past-matches
 *
 * Rattrapage de tous les matchs `finished` ayant encore des pronos
 * en statut `pending`. Idempotent. Réservé aux modérateurs.
 *
 * Réponse : { pronoMatchesFound, pronoMatchesResolved,
 *             openVarEventsOnFinishedMatches, errors }
 */
export async function POST() {
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

  const admin = createAdminClient();

  const summary = {
    pronoMatchesFound: 0,
    pronoMatchesResolved: 0,
    openVarEventsOnFinishedMatches: 0,
    errors: [] as string[],
  };

  // ── 1. Pronos pending sur matchs terminés ─────────────────────────────────
  const { data: pendingPronos } = await admin
    .from("pronos")
    .select("match_id")
    .eq("status", "pending");

  const pronoMatchIds = [
    ...new Set((pendingPronos ?? []).map((p) => p.match_id)),
  ];

  if (pronoMatchIds.length > 0) {
    const { data: finishedMatches } = await admin
      .from("matches")
      .select("id")
      .eq("status", "finished")
      .in("id", pronoMatchIds);

    const toResolve = (finishedMatches ?? []).map((m) => m.id);
    summary.pronoMatchesFound = toResolve.length;

    for (const matchId of toResolve) {
      const { error } = await admin.rpc("resolve_match_pronos", {
        p_match_id: matchId,
      });
      if (error) {
        summary.errors.push(`pronos[${matchId}]: ${error.message}`);
      } else {
        summary.pronoMatchesResolved++;
      }
    }
  }

  // ── 2. Market events VAR ouverts sur matchs terminés (info seule) ─────────
  // Ces events nécessitent une décision manuelle (OUI/NON) via l'admin resolve UI.
  const { data: finishedMatchList } = await admin
    .from("matches")
    .select("id")
    .eq("status", "finished");

  if (finishedMatchList?.length) {
    const ids = finishedMatchList.map((m) => m.id);
    const { count } = await admin
      .from("market_events")
      .select("id", { count: "exact", head: true })
      .in("match_id", ids)
      .in("status", ["open", "locked"]);
    summary.openVarEventsOnFinishedMatches = count ?? 0;
  }

  return successResponse(summary);
}
