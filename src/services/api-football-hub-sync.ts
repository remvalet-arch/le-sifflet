import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchApiFootball,
  getApiFootballSeasonYear,
} from "@/lib/api-football-client";

type ApiPlayerEntry = {
  player: { id: number; name: string; photo: string };
  statistics: Array<{
    team: { logo: string };
    goals: { total: number | null; assists: number | null };
    games: { appearences: number | null };
  }>;
};

type ApiStandingEntry = {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number };
  form: string | null;
  group?: string;
};

export async function syncLeagueStandings(
  leagueId: number,
  season: number,
): Promise<void> {
  const admin = createAdminClient();
  const payload = await fetchApiFootball<{
    response: Array<{ league: { standings: ApiStandingEntry[][] } }>;
  }>("standings", { league: String(leagueId), season: String(season) });

  const groups = payload.response?.[0]?.league?.standings ?? [];
  if (groups.length === 0) return;

  const rows = groups.flatMap((group) => {
    const groupName =
      group.length > 0 && group[0]?.group ? String(group[0].group) : null;
    return group.map((s) => ({
      league_id: leagueId,
      season,
      rank: s.rank,
      team_id: s.team.id,
      team_name: s.team.name,
      team_logo: s.team.logo || null,
      points: s.points,
      goals_diff: s.goalsDiff,
      played: s.all.played,
      form: s.form ?? null,
      group_name: groupName,
      updated_at: new Date().toISOString(),
    }));
  });

  await admin
    .from("league_standings")
    .upsert(rows, { onConflict: "league_id,season,team_id" });
}

export async function syncLeagueTopScorers(
  leagueId: number,
  season: number,
): Promise<void> {
  const admin = createAdminClient();
  const payload = await fetchApiFootball<{ response: ApiPlayerEntry[] }>(
    "players/topscorers",
    { league: String(leagueId), season: String(season) },
  );

  const entries = payload.response ?? [];
  if (entries.length === 0) return;

  const rows = entries.map((entry, idx) => ({
    league_id: leagueId,
    season,
    type: "scorer" as const,
    rank: idx + 1,
    player_id: entry.player.id,
    player_name: entry.player.name,
    player_photo: entry.player.photo || null,
    team_logo: entry.statistics[0]?.team.logo || null,
    goals_or_assists_count: entry.statistics[0]?.goals.total ?? 0,
    played_matches: entry.statistics[0]?.games.appearences ?? 0,
    updated_at: new Date().toISOString(),
  }));

  await admin
    .from("league_top_players")
    .upsert(rows, { onConflict: "league_id,season,type,player_id" });
}

export async function syncLeagueTopAssists(
  leagueId: number,
  season: number,
): Promise<void> {
  const admin = createAdminClient();
  const payload = await fetchApiFootball<{ response: ApiPlayerEntry[] }>(
    "players/topassists",
    { league: String(leagueId), season: String(season) },
  );

  const entries = payload.response ?? [];
  if (entries.length === 0) return;

  const rows = entries.map((entry, idx) => ({
    league_id: leagueId,
    season,
    type: "assist" as const,
    rank: idx + 1,
    player_id: entry.player.id,
    player_name: entry.player.name,
    player_photo: entry.player.photo || null,
    team_logo: entry.statistics[0]?.team.logo || null,
    goals_or_assists_count: entry.statistics[0]?.goals.assists ?? 0,
    played_matches: entry.statistics[0]?.games.appearences ?? 0,
    updated_at: new Date().toISOString(),
  }));

  await admin
    .from("league_top_players")
    .upsert(rows, { onConflict: "league_id,season,type,player_id" });
}

export async function syncLeagueHubData(
  leagueId: number,
  season?: number,
): Promise<void> {
  const s = season ?? getApiFootballSeasonYear();
  await Promise.allSettled([
    syncLeagueStandings(leagueId, s),
    syncLeagueTopScorers(leagueId, s),
    syncLeagueTopAssists(leagueId, s),
  ]);
}
