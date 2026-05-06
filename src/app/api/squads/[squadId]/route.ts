import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

type ChampionshipStanding = {
  user_id: string;
  username: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  pronos_pts: number;
};

type ChampionshipFixture = {
  id: string;
  round_number: number;
  week_start: string;
  home_member_id: string;
  home_username: string;
  away_member_id: string;
  away_username: string;
  home_points: number | null;
  away_points: number | null;
  winner_id: string | null;
  status: string;
};

type ChampionshipData = {
  season_id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  standings: ChampionshipStanding[];
  current_fixtures: ChampionshipFixture[];
};

type PastSeason = {
  season_id: string;
  ended_at: string | null;
  champion_user_id: string | null;
  champion_username: string | null;
  champion_points: number;
};

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
        total_xp_earned: 0,
        period,
        activity: [],
      });
    }

    const adminSupabase = createAdminClient();

    const [{ data: profiles, error: pErr }, { data: bigWins }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, xp, sifflets_balance, rank")
          .in("id", memberIds),
        adminSupabase
          .from("pronos")
          .select(
            "user_id, points_earned, contre_pied_bonus, match_id, placed_at",
          )
          .in("user_id", memberIds)
          .eq("status", "won")
          .gt("points_earned", 100)
          .order("points_earned", { ascending: false })
          .limit(15),
      ]);

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

    // Pronos query — filter on placed_at (not match start_time) for accurate period tracking
    let pronosQuery = adminSupabase
      .from("pronos")
      .select("user_id, points_earned")
      .in("user_id", memberIds)
      .gt("points_earned", 0);

    if (cutoffIso) {
      pronosQuery = pronosQuery.gte("placed_at", cutoffIso);
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

    const [{ data: userPronos, error: wErr }, { data: userBets, error: bErr }] =
      await Promise.all([pronosQuery, betsQuery]);

    if (wErr) {
      console.error("Supabase Error (pronos):", wErr);
      return errorResponse(wErr.message, 500);
    }

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

    const total_xp_earned = leaderboard.reduce((s, m) => s + m.xp, 0);

    const usernameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.username]),
    );

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

    // ── Championship data (mode braquage) ─────────────────────────────────────
    let championship: ChampionshipData | null = null;
    if (squad.game_mode === "braquage") {
      const { data: season } = await adminSupabase
        .from("squad_seasons")
        .select("id, status, current_round, total_rounds")
        .eq("squad_id", squadId)
        .in("status", ["pending", "active", "finished"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (season) {
        const [{ data: standingsRaw }, { data: fixturesRaw }] =
          await Promise.all([
            adminSupabase
              .from("squad_standings")
              .select("user_id, played, won, drawn, lost, points, pronos_pts")
              .eq("season_id", season.id)
              .order("points", { ascending: false }),
            adminSupabase
              .from("squad_fixtures")
              .select(
                "id, round_number, week_start, home_member_id, away_member_id, home_points, away_points, winner_id, status",
              )
              .eq("season_id", season.id)
              .eq("round_number", season.current_round),
          ]);

        const standings: ChampionshipStanding[] = (standingsRaw ?? []).map(
          (s) => ({
            user_id: s.user_id,
            username: usernameById.get(s.user_id) ?? "???",
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            points: s.points,
            pronos_pts: s.pronos_pts,
          }),
        );

        const current_fixtures: ChampionshipFixture[] = (fixturesRaw ?? []).map(
          (f) => ({
            id: f.id,
            round_number: f.round_number,
            week_start: f.week_start,
            home_member_id: f.home_member_id,
            home_username: usernameById.get(f.home_member_id) ?? "???",
            away_member_id: f.away_member_id,
            away_username: usernameById.get(f.away_member_id) ?? "???",
            home_points: f.home_points,
            away_points: f.away_points,
            winner_id: f.winner_id,
            status: f.status,
          }),
        );

        championship = {
          season_id: season.id,
          status: season.status,
          current_round: season.current_round,
          total_rounds: season.total_rounds,
          standings,
          current_fixtures,
        };
      }
    }

    // ── Past seasons / Palmarès ─────────────────────────────────────────────
    let past_seasons: PastSeason[] = [];
    if (squad.game_mode === "braquage") {
      const { data: finishedSeasons } = await adminSupabase
        .from("squad_seasons")
        .select("id, ended_at")
        .eq("squad_id", squadId)
        .eq("status", "finished")
        .order("ended_at", { ascending: false })
        .limit(3);

      if (finishedSeasons && finishedSeasons.length > 0) {
        const seasonIds = finishedSeasons.map((s) => s.id);
        const { data: championsRaw } = await adminSupabase
          .from("squad_standings")
          .select("season_id, user_id, points")
          .in("season_id", seasonIds)
          .order("points", { ascending: false });

        const topBySeasonId = new Map<
          string,
          { user_id: string; points: number }
        >();
        for (const c of championsRaw ?? []) {
          if (!topBySeasonId.has(c.season_id)) {
            topBySeasonId.set(c.season_id, {
              user_id: c.user_id,
              points: c.points,
            });
          }
        }

        past_seasons = finishedSeasons.map((s) => {
          const champ = topBySeasonId.get(s.id);
          return {
            season_id: s.id,
            ended_at: s.ended_at,
            champion_user_id: champ?.user_id ?? null,
            champion_username: champ
              ? (usernameById.get(champ.user_id) ?? "???")
              : null,
            champion_points: champ?.points ?? 0,
          };
        });
      }
    }

    return successResponse({
      squad,
      leaderboard,
      total_xp_earned,
      period,
      activity,
      championship,
      past_seasons,
    });
  } catch (error) {
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
