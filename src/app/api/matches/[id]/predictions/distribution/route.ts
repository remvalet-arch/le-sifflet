import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

type Outcome = "1" | "N" | "2";

function parseOutcome(pronoValue: string): Outcome | null {
  const m = /^(\d+)-(\d+)$/.exec(pronoValue);
  if (!m) return null;
  const home = parseInt(m[1]!, 10);
  const away = parseInt(m[2]!, 10);
  if (home > away) return "1";
  if (home === away) return "N";
  return "2";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { id: matchId } = await params;
  const scope = request.nextUrl.searchParams.get("scope") ?? "global";

  const admin = createAdminClient();

  // Determine which user IDs to include
  let targetUserIds: string[] | null = null; // null = all users

  if (scope === "my-leagues") {
    const { data: memberships } = await supabase.rpc(
      "squad_members_for_my_squads",
    );
    if (memberships && memberships.length > 0) {
      targetUserIds = [...new Set(memberships.map((m) => m.user_id))];
    } else {
      // No squads — return empty distribution
      return successResponse({
        home_win_pct: 0,
        draw_pct: 0,
        away_win_pct: 0,
        avg_home_score: null,
        avg_away_score: null,
        total_predictions: 0,
        user_vote: null,
        scope,
      });
    }
  }

  // Fetch exact_score pronos for this match
  let pronosQuery = admin
    .from("pronos")
    .select("user_id, prono_value")
    .eq("match_id", matchId)
    .eq("prono_type", "exact_score");

  if (targetUserIds) {
    pronosQuery = pronosQuery.in("user_id", targetUserIds);
  }

  const { data: pronos, error } = await pronosQuery;
  if (error) return errorResponse(error.message, 500);

  if (!pronos || pronos.length === 0) {
    return successResponse({
      home_win_pct: 0,
      draw_pct: 0,
      away_win_pct: 0,
      avg_home_score: null,
      avg_away_score: null,
      total_predictions: 0,
      user_vote: null,
      scope,
    });
  }

  let home = 0;
  let draw = 0;
  let away = 0;
  let totalHome = 0;
  let totalAway = 0;
  let userVote: Outcome | null = null;

  for (const p of pronos) {
    const outcome = parseOutcome(p.prono_value);
    if (!outcome) continue;
    if (p.user_id === user.id) userVote = outcome;

    if (outcome === "1") home++;
    else if (outcome === "N") draw++;
    else away++;

    const m = /^(\d+)-(\d+)$/.exec(p.prono_value);
    if (m) {
      totalHome += parseInt(m[1]!, 10);
      totalAway += parseInt(m[2]!, 10);
    }
  }

  const total = home + draw + away;
  if (total === 0) {
    return successResponse({
      home_win_pct: 0,
      draw_pct: 0,
      away_win_pct: 0,
      avg_home_score: null,
      avg_away_score: null,
      total_predictions: 0,
      user_vote: null,
      scope,
    });
  }

  return successResponse({
    home_win_pct: Math.round((home / total) * 100),
    draw_pct: Math.round((draw / total) * 100),
    away_win_pct: Math.round((away / total) * 100),
    avg_home_score: Math.round((totalHome / total) * 10) / 10,
    avg_away_score: Math.round((totalAway / total) * 10) / 10,
    total_predictions: total,
    user_vote: userVote,
    scope,
  });
}
