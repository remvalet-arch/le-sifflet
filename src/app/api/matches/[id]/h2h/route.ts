import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getTeamLastEvents } from "@/lib/services/thesportsdb";

export type H2HResult = {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: matchId } = await params;
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("team_home, team_away, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return errorResponse("Match introuvable", 404);

  // Need TheSportsDB team IDs
  if (!match.home_team_id || !match.away_team_id) {
    return successResponse({ results: [], total: 0 });
  }

  const [homeTeam, awayTeam] = await Promise.all([
    admin
      .from("teams")
      .select("thesportsdb_team_id, name")
      .eq("id", match.home_team_id)
      .maybeSingle(),
    admin
      .from("teams")
      .select("thesportsdb_team_id, name")
      .eq("id", match.away_team_id)
      .maybeSingle(),
  ]);

  if (!homeTeam.data?.thesportsdb_team_id) {
    return successResponse({ results: [], total: 0 });
  }

  // Fetch last events for home team, then filter for confrontations with the away team
  const events = await getTeamLastEvents(homeTeam.data.thesportsdb_team_id);

  const awayName = awayTeam.data?.name ?? match.team_away;
  const homeName = homeTeam.data?.name ?? match.team_home;

  const h2h: H2HResult[] = events
    .filter((e) => {
      const hasHome =
        e.strHomeTeam.toLowerCase().includes(homeName.toLowerCase()) ||
        e.strAwayTeam.toLowerCase().includes(homeName.toLowerCase());
      const hasAway =
        e.strHomeTeam.toLowerCase().includes(awayName.toLowerCase()) ||
        e.strAwayTeam.toLowerCase().includes(awayName.toLowerCase());
      return (
        hasHome && hasAway && e.intHomeScore !== null && e.intAwayScore !== null
      );
    })
    .slice(0, 5)
    .map((e) => ({
      date: e.dateEvent,
      home_team: e.strHomeTeam,
      away_team: e.strAwayTeam,
      home_score: parseInt(e.intHomeScore ?? "0", 10),
      away_score: parseInt(e.intAwayScore ?? "0", 10),
    }));

  return successResponse({ results: h2h, total: h2h.length });
}
