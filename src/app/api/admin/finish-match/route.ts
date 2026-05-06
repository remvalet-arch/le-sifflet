import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { syncLeagueHubData } from "@/services/api-football-hub-sync";
import { getApiFootballSeasonYear } from "@/lib/api-football-client";
import { sendPushToMatchSubscribers } from "@/lib/push-sender";
import { checkAndUnlockBadges } from "@/app/actions/badges";

export async function POST(request: NextRequest) {
  // ── Guard modérateur ────────────────────────────────────────────────────────
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
    event_type: "info",
    minute: 90,
    team_side: "home",
    player_name: "Arbitre",
    is_own_goal: false,
    details: "Fin du match",
  });

  // ── 3. Résolution des paris long terme ────────────────────────────────────
  const { error: rpcErr } = await admin.rpc("resolve_long_term_bets", {
    p_match_id: match_id,
  });

  if (rpcErr) return errorResponse(`Résolution échouée : ${rpcErr.message}`);

  const { error: pronoErr } = await admin.rpc("resolve_match_pronos", {
    p_match_id: match_id,
  });
  if (pronoErr) {
    console.warn(`[finish-match] resolve_match_pronos: ${pronoErr.message}`);
  }

  // Push fin de match + badges pronos gagnants (fire-and-forget)
  void (async () => {
    await sendPushToMatchSubscribers(match_id, {
      title: "⏱ Match terminé !",
      body: `${match.team_home} ${match.home_score ?? 0}–${match.away_score ?? 0} ${match.team_away} — Résultats pronos disponibles`,
      url: `/match/${match_id}`,
    });

    const { data: wonPronos } = await admin
      .from("pronos")
      .select("user_id")
      .eq("match_id", match_id)
      .eq("status", "won");
    const pronoWinnerIds = [
      ...new Set((wonPronos ?? []).map((p) => p.user_id)),
    ];
    if (pronoWinnerIds.length > 0) {
      await Promise.all(pronoWinnerIds.map((uid) => checkAndUnlockBadges(uid)));
    }
  })();

  // Async hub stats sync — ne bloque pas la réponse
  void (async () => {
    const { data: comp } = await admin
      .from("matches")
      .select("competition_id")
      .eq("id", match_id)
      .single();
    if (!comp?.competition_id) return;
    const { data: league } = await admin
      .from("competitions")
      .select("api_football_league_id")
      .eq("id", comp.competition_id)
      .single();
    if (!league?.api_football_league_id) return;
    await syncLeagueHubData(
      league.api_football_league_id,
      getApiFootballSeasonYear(),
    );
  })();

  return successResponse({
    finished: true,
    score: `${match.home_score}-${match.away_score}`,
    match: `${match.team_home} — ${match.team_away}`,
  });
}
