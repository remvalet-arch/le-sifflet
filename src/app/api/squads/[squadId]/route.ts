import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  pronos_xp: number;
  var_xp: number;
  sifflets_balance: number;
  rank: string;
};

type ActivityItem = {
  user_id: string;
  username: string;
  points_earned: number;
  contre_pied_bonus: number;
  match_id: string;
  team_home: string;
  team_away: string;
  placed_at: string;
};

/** GET — détail ligue + classement membres. ?period=week pour classement hebdo. Réservé aux membres. */
export async function GET(
  request: Request,
  context: { params: Promise<{ squadId: string }> },
) {
  try {
    const { squadId } = await context.params;
    if (!squadId) return errorResponse("squadId requis", 400);

    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period =
      periodParam === "week"
        ? "week"
        : periodParam === "month"
          ? "month"
          : "general";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Non authentifié", 401);

    const { data: membership, error: memErr } = await supabase
      .from("squad_members")
      .select("squad_id")
      .eq("squad_id", squadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      console.error("Supabase Error:", memErr);
      return errorResponse(memErr.message, 500);
    }
    if (!membership)
      return errorResponse("Ligue introuvable ou accès refusé", 403);

    const { data: squad, error: sErr } = await supabase
      .from("squads")
      .select("*")
      .eq("id", squadId)
      .maybeSingle();

    if (sErr || !squad) {
      if (sErr) console.error("Supabase Error:", sErr);
      return errorResponse("Ligue introuvable", 404);
    }

    const { data: pairs, error: rpcErr } = await supabase.rpc(
      "squad_members_for_my_squads",
    );
    if (rpcErr) {
      console.error("Supabase Error:", rpcErr);
      return errorResponse(rpcErr.message, 500);
    }

    const memberIds = [
      ...new Set(
        (pairs ?? [])
          .filter((p) => p.squad_id === squadId)
          .map((p) => p.user_id),
      ),
    ];
    if (memberIds.length === 0) {
      return successResponse({
        squad,
        leaderboard: [] as LeaderboardRow[],
        pot_commun: 0,
        period,
        activity: [],
      });
    }

    const adminSupabase = createAdminClient();

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, xp, sifflets_balance, rank")
      .in("id", memberIds);
    if (pErr) {
      console.error("Supabase Error:", pErr);
      return errorResponse(pErr.message, 500);
    }

    const xpByUser: Map<string, number> = new Map();
    const pronosXpByUser: Map<string, number> = new Map();
    const varXpByUser: Map<string, number> = new Map();

    let cutoffIso: string | null = null;
    if (period === "week" || period === "month") {
      const now = new Date();
      const cutoff = new Date(now);
      if (period === "week") {
        cutoff.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      } else {
        cutoff.setDate(1);
      }
      cutoff.setHours(0, 0, 0, 0);
      cutoffIso = cutoff.toISOString();
    }

    // Pronos query
    let pronosQuery = adminSupabase
      .from("pronos")
      .select("user_id, points_earned, matches!inner(start_time)")
      .in("user_id", memberIds)
      .gt("points_earned", 0);

    if (cutoffIso) {
      pronosQuery = pronosQuery.gte("matches.start_time", cutoffIso);
    }

    const { data: userPronos, error: wErr } = await pronosQuery;

    if (wErr) {
      console.error("Supabase Error (pronos):", wErr);
      return errorResponse(wErr.message, 500);
    }

    // Bets query
    let betsQuery = adminSupabase
      .from("bets")
      .select("user_id, potential_reward, amount_staked, placed_at")
      .in("user_id", memberIds)
      .eq("status", "won");

    if (cutoffIso) {
      betsQuery = betsQuery.gte("placed_at", cutoffIso);
    }

    const { data: userBets, error: bErr } = await betsQuery;

    if (bErr) {
      console.error("Supabase Error (bets):", bErr);
      return errorResponse(bErr.message, 500);
    }

    for (const p of userPronos ?? []) {
      pronosXpByUser.set(
        p.user_id,
        (pronosXpByUser.get(p.user_id) ?? 0) + p.points_earned,
      );
      xpByUser.set(p.user_id, (xpByUser.get(p.user_id) ?? 0) + p.points_earned);
    }

    for (const b of userBets ?? []) {
      const netGain = b.potential_reward - b.amount_staked;
      if (netGain > 0) {
        varXpByUser.set(b.user_id, (varXpByUser.get(b.user_id) ?? 0) + netGain);
        xpByUser.set(b.user_id, (xpByUser.get(b.user_id) ?? 0) + netGain);
      }
    }

    const leaderboard: LeaderboardRow[] = (profiles ?? [])
      .map((p) => ({
        user_id: p.id,
        username: p.username,
        xp: xpByUser.get(p.id) ?? 0,
        pronos_xp: pronosXpByUser.get(p.id) ?? 0,
        var_xp: varXpByUser.get(p.id) ?? 0,
        sifflets_balance: p.sifflets_balance ?? 0,
        rank: p.rank ?? "—",
      }))
      .sort(
        (a, b) => b.xp - a.xp || a.username.localeCompare(b.username, "fr"),
      );

    const pot_commun = leaderboard.reduce((s, m) => s + m.xp, 0);

    const usernameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.username]),
    );

    const { data: bigWins } = await adminSupabase
      .from("pronos")
      .select("user_id, points_earned, contre_pied_bonus, match_id, placed_at")
      .in("user_id", memberIds)
      .eq("status", "won")
      .gt("points_earned", 100)
      .order("points_earned", { ascending: false })
      .limit(15);

    const matchIds = [...new Set((bigWins ?? []).map((w) => w.match_id))];
    const matchMap: Map<string, { team_home: string; team_away: string }> =
      new Map();
    if (matchIds.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, team_home, team_away")
        .in("id", matchIds);
      for (const m of matches ?? []) {
        matchMap.set(m.id, { team_home: m.team_home, team_away: m.team_away });
      }
    }

    const activity: ActivityItem[] = (bigWins ?? [])
      .map((w) => {
        const match = matchMap.get(w.match_id);
        if (!match) return null;
        return {
          user_id: w.user_id,
          username: usernameById.get(w.user_id) ?? "???",
          points_earned: w.points_earned,
          contre_pied_bonus: w.contre_pied_bonus,
          match_id: w.match_id,
          team_home: match.team_home,
          team_away: match.team_away,
          placed_at: w.placed_at,
        };
      })
      .filter((x): x is ActivityItem => x !== null)
      .slice(0, 10);

    return successResponse({
      squad,
      leaderboard,
      pot_commun,
      period,
      activity,
    });
  } catch (error) {
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
