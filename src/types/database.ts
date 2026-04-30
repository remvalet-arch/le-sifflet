export type MatchStatus = "upcoming" | "live" | "finished";
export type TimelineEventType = "goal" | "yellow_card" | "red_card" | "substitution";
export type MarketEventType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "injury_sub";
export type MarketEventStatus = "open" | "locked" | "resolved";
export type BetStatus = "pending" | "won" | "lost";
export type AlertActionType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "injury_sub";

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
          created_at: string;
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
          created_at?: string;
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
          created_at?: string;
        };
        Relationships: [];
      };
      lineups: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          team_side: "home" | "away";
          position: "G" | "D" | "M" | "A";
          status: "starter" | "bench";
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          team_side: "home" | "away";
          position?: "G" | "D" | "M" | "A";
          status?: "starter" | "bench";
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          team_side?: "home" | "away";
          position?: "G" | "D" | "M" | "A";
          status?: "starter" | "bench";
          created_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          match_id: string;
          name: string;
          is_private: boolean;
          invite_code: string | null;
          admin_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          name: string;
          is_private?: boolean;
          invite_code?: string | null;
          admin_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          name?: string;
          is_private?: boolean;
          invite_code?: string | null;
          admin_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          user_id: string;
          room_id: string;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          room_id: string;
          joined_at?: string;
        };
        Update: {
          user_id?: string;
          room_id?: string;
          joined_at?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_type: TimelineEventType;
          minute: number;
          team_side: "home" | "away";
          player_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          event_type?: TimelineEventType;
          minute?: number;
          team_side?: "home" | "away";
          player_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      place_bet: {
        Args: {
          p_event_id: string;
          p_chosen_option: string;
          p_amount_staked: number;
          p_multiplier?: number;
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
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
export type MarketEventRow =
  Database["public"]["Tables"]["market_events"]["Row"];
export type LineupRow = Database["public"]["Tables"]["lineups"]["Row"];
export type BetRow = Database["public"]["Tables"]["bets"]["Row"];
export type AlertSignalRow =
  Database["public"]["Tables"]["alert_signals"]["Row"];
export type MatchTimelineEventRow =
  Database["public"]["Tables"]["match_timeline_events"]["Row"];
