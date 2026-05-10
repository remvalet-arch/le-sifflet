import type { MatchTier } from "./analytics";

const TOP_TEAMS = new Set<string>([
  "Paris SG",
  "Marseille",
  "Lyon",
  "Monaco",
  "Lille",
  "Rennes",
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Manchester United",
  "Chelsea",
  "Tottenham",
  "Real Madrid",
  "Barcelona",
  "Atletico Madrid",
  "Inter",
  "Juventus",
  "AC Milan",
  "Napoli",
  "Bayern Munich",
  "Dortmund",
  "France",
  "Brazil",
  "Argentina",
  "Germany",
  "Spain",
  "England",
  "Portugal",
]);

interface MatchForTier {
  team_home: string;
  team_away: string;
  competition_id: string;
  is_derby?: boolean;
  is_cup_final?: boolean;
}

export function classifyMatchTier(match: MatchForTier): MatchTier {
  if (match.is_cup_final) return "top";
  if (match.is_derby) return "top";

  const homeTop = TOP_TEAMS.has(match.team_home);
  const awayTop = TOP_TEAMS.has(match.team_away);

  if (homeTop && awayTop) return "top";
  if (homeTop || awayTop) return "mid";
  return "low";
}
