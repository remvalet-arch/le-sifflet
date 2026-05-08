import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { syncLeagueHubData } from "@/services/api-football-hub-sync";
import { getApiFootballSeasonYear } from "@/lib/api-football-client";
import { sendPushToMatchSubscribers, sendPushToUsers } from "@/lib/push-sender";
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

  // Personalized push + badges (fire-and-forget)
  void (async () => {
    const scoreStr = `${match.home_score ?? 0}–${match.away_score ?? 0}`;

    const { data: allPronos } = await admin
      .from("pronos")
      .select("user_id, status, points_earned")
      .eq("match_id", match_id)
      .in("status", ["won", "lost"]);

    const pronoUserIds = [...new Set((allPronos ?? []).map((p) => p.user_id))];

    // Aggregate earned points per user
    const userEarned = new Map<string, number>();
    for (const p of allPronos ?? []) {
      if (p.status === "won") {
        userEarned.set(
          p.user_id,
          (userEarned.get(p.user_id) ?? 0) + (p.points_earned ?? 0),
        );
      }
    }

    // Badges for prono winners
    const winnerIds = pronoUserIds.filter(
      (uid) => (userEarned.get(uid) ?? 0) > 0,
    );
    if (winnerIds.length > 0) {
      await Promise.all(winnerIds.map((uid) => checkAndUnlockBadges(uid)));
    }

    // Fetch notif opt-outs
    const { data: prefs } = await admin
      .from("profiles")
      .select("id, notif_prono_results")
      .in("id", pronoUserIds);
    const optedOut = new Set(
      (prefs ?? []).filter((p) => !p.notif_prono_results).map((p) => p.id),
    );

    // Personalized pushes for prono users
    await Promise.all(
      pronoUserIds
        .filter((uid) => !optedOut.has(uid))
        .map((uid) => {
          const earned = userEarned.get(uid) ?? 0;
          const bodyText =
            earned > 0
              ? `${match.team_home} ${scoreStr} ${match.team_away} — Tu as gagné +${earned} Points ! 🎯`
              : `${match.team_home} ${scoreStr} ${match.team_away} — Pas de chance. Retente sur le prochain !`;
          return sendPushToUsers([uid], {
            title: "⏱ Match terminé !",
            body: bodyText,
            url: `/match/${match_id}`,
          });
        }),
    );

    // Generic push for match subscribers who didn't prono
    if (pronoUserIds.length === 0) {
      await sendPushToMatchSubscribers(match_id, {
        title: "⏱ Match terminé !",
        body: `${match.team_home} ${scoreStr} ${match.team_away} — Résultats disponibles`,
        url: `/match/${match_id}`,
      });
    }
  })();

  // V4 — Push "dépassement" quand un ami dépasse un autre dans une ligue
  void (async () => {
    const { data: allMatchPronos } = await admin
      .from("pronos")
      .select("user_id, status, points_earned")
      .eq("match_id", match_id);

    if (!allMatchPronos || allMatchPronos.length === 0) return;

    // Sum pts earned per user in this match
    const matchPtsMap = new Map<string, number>();
    for (const p of allMatchPronos) {
      if (p.status === "won" && p.points_earned) {
        matchPtsMap.set(
          p.user_id,
          (matchPtsMap.get(p.user_id) ?? 0) + p.points_earned,
        );
      }
    }

    const allUserIds = [...new Set(allMatchPronos.map((p) => p.user_id))];
    if (allUserIds.length < 2) return;

    const [profilesRes, membershipsRes, friendsRes] = await Promise.all([
      admin.from("profiles").select("id, username, xp").in("id", allUserIds),
      admin
        .from("squad_members")
        .select("user_id, squad_id")
        .in("user_id", allUserIds),
      admin
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .in("sender_id", allUserIds)
        .in("receiver_id", allUserIds)
        .eq("status", "accepted"),
    ]);

    if (!membershipsRes.data || !friendsRes.data) return;

    // Build friend set (bidirectional)
    const friendPairs = new Set<string>();
    for (const f of friendsRes.data) {
      friendPairs.add(`${f.sender_id}|${f.receiver_id}`);
      friendPairs.add(`${f.receiver_id}|${f.sender_id}`);
    }
    if (friendPairs.size === 0) return;

    // Build squad → members map
    const squadToMembers = new Map<string, string[]>();
    for (const m of membershipsRes.data) {
      const list = squadToMembers.get(m.squad_id) ?? [];
      list.push(m.user_id);
      squadToMembers.set(m.squad_id, list);
    }

    const squadIds = [...squadToMembers.keys()];
    if (squadIds.length === 0) return;

    const { data: squads } = await admin
      .from("squads")
      .select("id, name")
      .in("id", squadIds);
    const squadNameMap = new Map((squads ?? []).map((s) => [s.id, s.name]));

    const xpMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p.xp ?? 0]),
    );
    const usernameMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p.username ?? "Un ami"]),
    );

    // Detect overtakes: for each squad, for each friend pair (A, B)
    // B overtook A if B.current_xp > A.current_xp AND B.before_xp <= A.before_xp
    const overtakePushes = new Map<string, string>(); // userId → push body

    for (const [squadId, members] of squadToMembers) {
      if (members.length < 2) continue;
      const squadName = squadNameMap.get(squadId) ?? "ta ligue";

      for (let i = 0; i < members.length; i++) {
        const bId = members[i];
        const bPts = matchPtsMap.get(bId) ?? 0;
        if (bPts === 0) continue; // B gained nothing, can't overtake

        const bCurrentXp = xpMap.get(bId) ?? 0;
        const bBeforeXp = bCurrentXp - bPts;

        for (let j = 0; j < members.length; j++) {
          if (i === j) continue;
          const aId = members[j];
          if (!friendPairs.has(`${aId}|${bId}`)) continue;

          const aCurrentXp = xpMap.get(aId) ?? 0;
          const aPts = matchPtsMap.get(aId) ?? 0;
          const aBeforeXp = aCurrentXp - aPts;

          if (bCurrentXp > aCurrentXp && bBeforeXp <= aBeforeXp) {
            if (!overtakePushes.has(aId)) {
              const bUsername = usernameMap.get(bId) ?? "Un ami";
              overtakePushes.set(
                aId,
                `🔥 ${bUsername} vient de te dépasser dans ${squadName} ! Réponds sur le prochain match.`,
              );
            }
          }
        }
      }
    }

    if (overtakePushes.size === 0) return;

    await Promise.all(
      [...overtakePushes.entries()].map(([userId, body]) =>
        sendPushToUsers([userId], {
          title: "🔥 Dépassé !",
          body,
          url: "/ligues",
        }),
      ),
    );
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
