export type MatchStatus =
  | "upcoming"
  | "first_half"
  | "half_time"
  | "second_half"
  | "paused"
  | "finished";

export type TimelineEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "info";
export type MarketEventType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "injury_sub"
  | "free_kick"
  | "corner";
export type MarketEventStatus = "open" | "closed" | "locked" | "resolved";
export type BetStatus = "pending" | "won" | "lost";
export type AlertActionType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "injury_sub"
  | "free_kick"
  | "corner";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          sifflets_balance: number;
          winrate: number;
          trust_score: number;
          last_refill_date: string | null;
          has_onboarded: boolean;
          created_at: string;
          xp: number;
          avatar_url: string | null;
          rank: string;
          updated_at: string | null;
          favorite_team_id: string | null;
        };
        Insert: {
          id: string;
          username: string;
          sifflets_balance?: number;
          winrate?: number;
          trust_score?: number;
          last_refill_date?: string | null;
          has_onboarded?: boolean;
          created_at?: string;
          xp?: number;
          avatar_url?: string | null;
          rank?: string;
          updated_at?: string | null;
          favorite_team_id?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          sifflets_balance?: number;
          winrate?: number;
          trust_score?: number;
          last_refill_date?: string | null;
          has_onboarded?: boolean;
          created_at?: string;
          xp?: number;
          avatar_url?: string | null;
          rank?: string;
          updated_at?: string | null;
          favorite_team_id?: string | null;
        };
        Relationships: [];
      };
      competitions: {
        Row: {
          id: string;
          name: string;
          badge_url: string | null;
          thesportsdb_league_id: string;
          api_football_league_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          badge_url?: string | null;
          thesportsdb_league_id: string;
          api_football_league_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          badge_url?: string | null;
          thesportsdb_league_id?: string;
          api_football_league_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          competition_id: string;
          name: string;
          short_name: string | null;
          logo_url: string | null;
          color_primary: string | null;
          color_secondary: string | null;
          equipment_url: string | null;
          team_color_1: string | null;
          team_color_2: string | null;
          stadium_name: string | null;
          stadium_thumb: string | null;
          thesportsdb_team_id: string;
          api_football_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          name: string;
          short_name?: string | null;
          logo_url?: string | null;
          color_primary?: string | null;
          color_secondary?: string | null;
          equipment_url?: string | null;
          team_color_1?: string | null;
          team_color_2?: string | null;
          stadium_name?: string | null;
          stadium_thumb?: string | null;
          thesportsdb_team_id: string;
          api_football_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          name?: string;
          short_name?: string | null;
          logo_url?: string | null;
          color_primary?: string | null;
          color_secondary?: string | null;
          equipment_url?: string | null;
          team_color_1?: string | null;
          team_color_2?: string | null;
          stadium_name?: string | null;
          stadium_thumb?: string | null;
          thesportsdb_team_id?: string;
          api_football_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          team_home: string;
          team_away: string;
          status: MatchStatus;
          start_time: string;
          alert_cooldown_until: string | null;
          home_score: number;
          away_score: number;
          match_minute: number | null;
          home_team_color: string | null;
          away_team_color: string | null;
          home_team_logo: string | null;
          away_team_logo: string | null;
          thesportsdb_event_id: string | null;
          api_football_id: number | null;
          created_at: string;
          competition_id: string | null;
          home_team_id: string | null;
          away_team_id: string | null;
          round_short: string | null;
          has_lineups: boolean;
          last_events_sync_at: string | null;
          last_stats_sync_at: string | null;
          odds_home: number | null;
          odds_draw: number | null;
          odds_away: number | null;
        };
        Insert: {
          id?: string;
          team_home: string;
          team_away: string;
          status?: MatchStatus;
          start_time: string;
          alert_cooldown_until?: string | null;
          home_score?: number;
          away_score?: number;
          match_minute?: number | null;
          home_team_color?: string | null;
          away_team_color?: string | null;
          home_team_logo?: string | null;
          away_team_logo?: string | null;
          thesportsdb_event_id?: string | null;
          api_football_id?: number | null;
          created_at?: string;
          competition_id?: string | null;
          home_team_id?: string | null;
          away_team_id?: string | null;
          round_short?: string | null;
          has_lineups?: boolean;
          last_events_sync_at?: string | null;
          last_stats_sync_at?: string | null;
          odds_home?: number | null;
          odds_draw?: number | null;
          odds_away?: number | null;
        };
        Update: {
          id?: string;
          team_home?: string;
          team_away?: string;
          status?: MatchStatus;
          start_time?: string;
          alert_cooldown_until?: string | null;
          home_score?: number;
          away_score?: number;
          match_minute?: number | null;
          home_team_color?: string | null;
          away_team_color?: string | null;
          home_team_logo?: string | null;
          away_team_logo?: string | null;
          thesportsdb_event_id?: string | null;
          api_football_id?: number | null;
          created_at?: string;
          competition_id?: string | null;
          home_team_id?: string | null;
          away_team_id?: string | null;
          round_short?: string | null;
          has_lineups?: boolean;
          last_events_sync_at?: string | null;
          last_stats_sync_at?: string | null;
          odds_home?: number | null;
          odds_draw?: number | null;
          odds_away?: number | null;
        };
        Relationships: [];
      };
      lineups: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          team_side: "home" | "away";
          position: string;
          status: "starter" | "bench";
          player_id: string | null;
          shirt_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          team_side: "home" | "away";
          position?: string;
          status?: "starter" | "bench";
          player_id?: string | null;
          shirt_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          team_side?: "home" | "away";
          position?: string;
          status?: "starter" | "bench";
          player_id?: string | null;
          shirt_number?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      squads: {
        Row: {
          id: string;
          name: string;
          is_private: boolean;
          invite_code: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_private?: boolean;
          invite_code?: string | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_private?: boolean;
          invite_code?: string | null;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      squad_members: {
        Row: {
          user_id: string;
          squad_id: string;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          squad_id: string;
          joined_at?: string;
        };
        Update: {
          user_id?: string;
          squad_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      match_subscriptions: {
        Row: {
          user_id: string;
          match_id: string;
          smart_mute: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          match_id: string;
          smart_mute?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          match_id?: string;
          smart_mute?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      market_events: {
        Row: {
          id: string;
          match_id: string;
          type: MarketEventType;
          status: MarketEventStatus;
          result: string | null;
          created_at: string;
          resolved_at: string | null;
          initiators: string[];
        };
        Insert: {
          id?: string;
          match_id: string;
          type: MarketEventType;
          status?: MarketEventStatus;
          result?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          initiators?: string[];
        };
        Update: {
          id?: string;
          match_id?: string;
          type?: MarketEventType;
          status?: MarketEventStatus;
          result?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          initiators?: string[];
        };
        Relationships: [];
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          chosen_option: string;
          amount_staked: number;
          potential_reward: number;
          placed_at: string;
          status: BetStatus;
          squad_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          chosen_option: string;
          amount_staked: number;
          potential_reward: number;
          placed_at?: string;
          status?: BetStatus;
          squad_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          chosen_option?: string;
          amount_staked?: number;
          potential_reward?: number;
          placed_at?: string;
          status?: BetStatus;
          squad_id?: string | null;
        };
        Relationships: [];
      };
      alert_signals: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          action_type: AlertActionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          action_type: AlertActionType;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          action_type?: AlertActionType;
          created_at?: string;
        };
        Relationships: [];
      };
      match_timeline_events: {
        Row: {
          id: string;
          match_id: string;
          event_type: TimelineEventType;
          minute: number;
          team_side: "home" | "away";
          player_name: string;
          is_own_goal: boolean;
          details: string | null;
          thesportsdb_event_id: string | null;
          api_football_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_type: TimelineEventType;
          minute: number;
          team_side: "home" | "away";
          player_name: string;
          is_own_goal?: boolean;
          details?: string | null;
          thesportsdb_event_id?: string | null;
          api_football_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          event_type?: TimelineEventType;
          minute?: number;
          team_side?: "home" | "away";
          player_name?: string;
          is_own_goal?: boolean;
          details?: string | null;
          thesportsdb_event_id?: string | null;
          api_football_event_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      long_term_bets: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          bet_type: "scorer" | "exact_score";
          bet_value: string;
          amount_staked: number;
          potential_reward: number;
          placed_at: string;
          status: "pending" | "won" | "lost";
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          bet_type: "scorer" | "exact_score";
          bet_value: string;
          amount_staked: number;
          potential_reward: number;
          placed_at?: string;
          status?: "pending" | "won" | "lost";
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          bet_type?: "scorer" | "exact_score";
          bet_value?: string;
          amount_staked?: number;
          potential_reward?: number;
          placed_at?: string;
          status?: "pending" | "won" | "lost";
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          thesportsdb_id: string;
          team_thesportsdb_id: string | null;
          team_name: string;
          player_name: string;
          position: string | null;
          synced_at: string;
          team_id: string | null;
          cutout_url: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          thesportsdb_id: string;
          team_thesportsdb_id?: string | null;
          team_name: string;
          player_name: string;
          position?: string | null;
          synced_at?: string;
          team_id?: string | null;
          cutout_url?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          thesportsdb_id?: string;
          team_thesportsdb_id?: string | null;
          team_name?: string;
          player_name?: string;
          position?: string | null;
          synced_at?: string;
          team_id?: string | null;
          cutout_url?: string | null;
          image_url?: string | null;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          label: string;
          description: string;
          icon_name: string;
          criteria_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          description: string;
          icon_name: string;
          criteria_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          description?: string;
          icon_name?: string;
          criteria_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          badge_id: string;
          unlocked_at?: string;
        };
        Update: {
          user_id?: string;
          badge_id?: string;
          unlocked_at?: string;
        };
        Relationships: [];
      };
      pronos: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          prono_type: "exact_score" | "scorer" | "scorer_allocation";
          prono_value: string;
          reward_amount: number;
          placed_at: string;
          status: "pending" | "won" | "lost";
          points_earned: number;
          contre_pied_bonus: number;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          prono_type: "exact_score" | "scorer" | "scorer_allocation";
          prono_value: string;
          reward_amount: number;
          placed_at?: string;
          status?: "pending" | "won" | "lost";
          points_earned?: number;
          contre_pied_bonus?: number;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          prono_type?: "exact_score" | "scorer" | "scorer_allocation";
          prono_value?: string;
          reward_amount?: number;
          placed_at?: string;
          status?: "pending" | "won" | "lost";
          points_earned?: number;
          contre_pied_bonus?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          keys: { p256dh: string; auth: string };
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          keys: { p256dh: string; auth: string };
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          keys?: { p256dh: string; auth: string };
          created_at?: string;
        };
        Relationships: [];
      };
      match_statistics: {
        Row: {
          id: string;
          match_id: string;
          team_id: string;
          type: string;
          value: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          team_id: string;
          type: string;
          value?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          team_id?: string;
          type?: string;
          value?: string | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      league_standings: {
        Row: {
          id: string;
          league_id: number;
          season: number;
          rank: number;
          team_id: number;
          team_name: string;
          team_logo: string | null;
          points: number;
          goals_diff: number;
          played: number;
          form: string | null;
          group_name: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: number;
          season: number;
          rank: number;
          team_id: number;
          team_name: string;
          team_logo?: string | null;
          points?: number;
          goals_diff?: number;
          played?: number;
          form?: string | null;
          group_name?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: number;
          season?: number;
          rank?: number;
          team_id?: number;
          team_name?: string;
          team_logo?: string | null;
          points?: number;
          goals_diff?: number;
          played?: number;
          form?: string | null;
          group_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      league_top_players: {
        Row: {
          id: string;
          league_id: number;
          season: number;
          type: "scorer" | "assist";
          rank: number;
          player_id: number;
          player_name: string;
          player_photo: string | null;
          team_logo: string | null;
          goals_or_assists_count: number;
          played_matches: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: number;
          season: number;
          type: "scorer" | "assist";
          rank: number;
          player_id: number;
          player_name: string;
          player_photo?: string | null;
          team_logo?: string | null;
          goals_or_assists_count?: number;
          played_matches?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: number;
          season?: number;
          type?: "scorer" | "assist";
          rank?: number;
          player_id?: number;
          player_name?: string;
          player_photo?: string | null;
          team_logo?: string | null;
          goals_or_assists_count?: number;
          played_matches?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      squad_nudge_logs: {
        Row: {
          id: string;
          squad_id: string | null;
          sent_by: string;
          nudge_type: "prono" | "var_alert";
          sent_at: string;
        };
        Insert: {
          id?: string;
          squad_id?: string | null;
          sent_by: string;
          nudge_type: "prono" | "var_alert";
          sent_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string | null;
          sent_by?: string;
          nudge_type?: "prono" | "var_alert";
          sent_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_match_pronos_stats: {
        Row: {
          match_id: string;
          total_pronos: number;
          community_1_pct: number;
          community_N_pct: number;
          community_2_pct: number;
          home_form: string | null;
          away_form: string | null;
        };
      };
    };
    Functions: {
      close_expired_market_events: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      place_bet: {
        Args: {
          p_event_id: string;
          p_chosen_option: string;
          p_amount_staked: number;
          p_multiplier?: number;
          p_squad_id?: string | null;
        };
        Returns: string;
      };
      resolve_event: {
        Args: {
          p_event_id: string;
          p_result: string;
        };
        Returns: undefined;
      };
      resolve_event_parimutuel: {
        Args: {
          p_event_id: string;
          p_result: string;
        };
        Returns: {
          winners: number;
          total_paid: number;
          multiplier: number;
          braquage_squads: number;
        };
      };
      get_event_odds: {
        Args: { p_event_id: string };
        Returns: Array<{
          option: string;
          pool_staked: number;
          total_pool: number;
          implied_multiplier: number;
        }>;
      };
      place_long_term_bet: {
        Args: {
          p_match_id: string;
          p_bet_type: string;
          p_bet_value: string;
          p_amount_staked: number;
          p_potential_reward: number;
        };
        Returns: string;
      };
      increment_match_score: {
        Args: {
          p_match_id: string;
          p_home_delta: number;
          p_away_delta: number;
        };
        Returns: undefined;
      };
      resolve_long_term_bets: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
      place_prono: {
        Args: {
          p_match_id: string;
          p_prono_type: string;
          p_prono_value: string;
          p_reward_amount: number;
        };
        Returns: string;
      };
      squad_members_for_my_squads: {
        Args: Record<string, never>;
        Returns: Array<{ squad_id: string; user_id: string }>;
      };
      squad_by_invite_code: {
        Args: { p_invite: string };
        Returns: Array<{
          id: string;
          name: string;
          is_private: boolean;
          invite_code: string | null;
          owner_id: string;
          created_at: string;
        }>;
      };
      resolve_match_pronos: {
        Args: { p_match_id: string };
        Returns: Record<string, unknown>;
      };
      place_match_prono: {
        Args: {
          p_match_id: string;
          p_home_score: number;
          p_away_score: number;
          p_scorers_json?: unknown;
        };
        Returns: Record<string, unknown>;
      };
      profile_rank_from_xp: {
        Args: { p_xp: number };
        Returns: string;
      };
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type SquadRow = Database["public"]["Tables"]["squads"]["Row"];
export type SquadMemberRow =
  Database["public"]["Tables"]["squad_members"]["Row"];
export type MatchSubscriptionRow =
  Database["public"]["Tables"]["match_subscriptions"]["Row"];
export type MarketEventRow =
  Database["public"]["Tables"]["market_events"]["Row"];
export type LineupRow = Database["public"]["Tables"]["lineups"]["Row"];
export type BetRow = Database["public"]["Tables"]["bets"]["Row"];
export type AlertSignalRow =
  Database["public"]["Tables"]["alert_signals"]["Row"];
export type MatchTimelineEventRow =
  Database["public"]["Tables"]["match_timeline_events"]["Row"];
export type LongTermBetRow =
  Database["public"]["Tables"]["long_term_bets"]["Row"];
export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type CompetitionRow =
  Database["public"]["Tables"]["competitions"]["Row"];
export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type BadgeRow = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadgeRow = Database["public"]["Tables"]["user_badges"]["Row"];
export type MatchStatisticsRow =
  Database["public"]["Tables"]["match_statistics"]["Row"];
export type PronoRow = Database["public"]["Tables"]["pronos"]["Row"];
export type LeagueStandingRow =
  Database["public"]["Tables"]["league_standings"]["Row"];
export type LeagueTopPlayerRow =
  Database["public"]["Tables"]["league_top_players"]["Row"];
