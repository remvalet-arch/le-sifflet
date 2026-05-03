import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  sifflets_balance: number;
  rank: string;
};

/** GET — détail ligue + classement membres (XP décroissant). Réservé aux membres. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ squadId: string }> },
) {
  try {
    const { squadId } = await context.params;
    if (!squadId) return errorResponse("squadId requis", 400);

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
    if (!membership) return errorResponse("Ligue introuvable ou accès refusé", 403);

    const { data: squad, error: sErr } = await supabase
      .from("squads")
      .select("*")
      .eq("id", squadId)
      .maybeSingle();

    if (sErr || !squad) {
      if (sErr) console.error("Supabase Error:", sErr);
      return errorResponse("Ligue introuvable", 404);
    }

    const { data: pairs, error: rpcErr } = await supabase.rpc("squad_members_for_my_squads");
    if (rpcErr) {
      console.error("Supabase Error:", rpcErr);
      return errorResponse(rpcErr.message, 500);
    }

    const memberIds = [...new Set((pairs ?? []).filter((p) => p.squad_id === squadId).map((p) => p.user_id))];
    if (memberIds.length === 0) {
      return successResponse({
        squad,
        leaderboard: [] as LeaderboardRow[],
        pot_commun: 0,
      });
    }

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, xp, sifflets_balance, rank")
      .in("id", memberIds);
    if (pErr) {
      console.error("Supabase Error:", pErr);
      return errorResponse(pErr.message, 500);
    }

    const leaderboard: LeaderboardRow[] = (profiles ?? [])
      .map((p) => ({
        user_id: p.id,
        username: p.username,
        xp: p.xp ?? 0,
        sifflets_balance: p.sifflets_balance ?? 0,
        rank: p.rank ?? "—",
      }))
      .sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username, "fr"));

    const pot_commun = leaderboard.reduce((s, m) => s + m.sifflets_balance, 0);

    return successResponse({ squad, leaderboard, pot_commun });
  } catch (error) {
    console.error("Supabase Error:", error);
    return errorResponse("Erreur serveur", 500);
  }
}
