import type { Database, MatchRow } from "@/types/database";

type TeamEmbed = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "name" | "logo_url" | "competition_id" | "color_primary"
>;

type CompetitionEmbed = Pick<
  Database["public"]["Tables"]["competitions"]["Row"],
  "id" | "name" | "badge_url" | "api_football_league_id"
>;

type TimelineEmbed = Pick<
  Database["public"]["Tables"]["match_timeline_events"]["Row"],
  "id" | "event_type" | "minute" | "team_side" | "player_name"
>;

/** Match lobby : ligne `matches` (dont `round_short`, `has_lineups`) + relations embed Supabase. */
export type LobbyMatchRow = MatchRow & {
  home_team: TeamEmbed | null;
  away_team: TeamEmbed | null;
  competition: CompetitionEmbed | null;
  match_timeline_events: TimelineEmbed[] | null;
};

export function toMatchRow(m: LobbyMatchRow): MatchRow {
  const {
    home_team: _omitHome,
    away_team: _omitAway,
    competition: _omitComp,
    match_timeline_events: _omitTl,
    ...rest
  } = m;
  void _omitHome;
  void _omitAway;
  void _omitComp;
  void _omitTl;
  return rest as MatchRow;
}
