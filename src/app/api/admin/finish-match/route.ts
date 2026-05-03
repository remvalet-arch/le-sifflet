import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export async function POST(request: NextRequest) {
  // ── Guard modérateur ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès réservé aux modérateurs", 403);
  }

  const body = (await request.json()) as { match_id?: string };
  const { match_id } = body;
  if (!match_id) return errorResponse("match_id manquant", 400);

  const admin = createAdminClient();

  // ── Vérifie que le match existe et n'est pas déjà terminé ──────────────────
  const { data: match, error: fetchErr } = await admin
    .from("matches")
    .select("id, status, team_home, team_away, home_score, away_score")
    .eq("id", match_id)
    .single();

  if (fetchErr || !match) return errorResponse("Match introuvable", 404);
  if (match.status === "finished") {
    return successResponse({ already_finished: true });
  }

  // ── 1. Passage du statut à 'finished' ─────────────────────────────────────
  const { error: updateErr } = await admin
    .from("matches")
    .update({ status: "finished" })
    .eq("id", match_id);

  if (updateErr) return errorResponse(updateErr.message);

  // ── 2. Événement timeline 'info' ───────────────────────────────────────────
  void admin.from("match_timeline_events").insert({
    match_id,
    event_type:  "info",
    minute:      90,
    team_side:   "home",
    player_name: "Arbitre",
    is_own_goal: false,
    details:     "Fin du match",
  });

  // ── 3. Résolution des paris long terme ────────────────────────────────────
  const { error: rpcErr } = await admin.rpc("resolve_long_term_bets", {
    p_match_id: match_id,
  });

  if (rpcErr) return errorResponse(`Résolution échouée : ${rpcErr.message}`);

  const { error: pronoErr } = await admin.rpc("resolve_match_pronos", { p_match_id: match_id });
  if (pronoErr) {
    console.warn(`[finish-match] resolve_match_pronos: ${pronoErr.message}`);
  }

  return successResponse({
    finished: true,
    score: `${match.home_score}-${match.away_score}`,
    match: `${match.team_home} — ${match.team_away}`,
  });
}
