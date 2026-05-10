export type MatchStatus =
  | "upcoming"
  | "first_half"
  | "half_time"
  | "second_half"
  | "paused"
  | "finished"
  | "cancelled"
  | "postponed";

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
  | "free_kick"
  | "corner"
  | "stoppage_ht"
  | "stoppage_ft";
export type MarketEventStatus = "open" | "closed" | "locked" | "resolved";
export type BetStatus = "pending" | "won" | "lost";
export type AlertActionType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
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
          last_login_date: string | null;
          login_streak: number;
          lifetime_points_earned: number;
          monthly_points_earned: number;
          preferred_competitions: string[] | null;
          default_var_bet_amount: number;
          season_points: number;
          current_season_id: string | null;
          notif_pre_match_5min: boolean;
          notif_var_results: boolean;
          notif_prono_results: boolean;
          notif_daily_digest: boolean;
          notif_pre_match_2h: boolean;
          notif_squad_chat: boolean;
          notif_dm: boolean;
          streak_freezes_owned: number;
          streak_freezes_used_count: number;
          equipped_avatar_id: string | null;
          equipped_border_id: string | null;
          equipped_effect_id: string | null;
          role: "user" | "moderator" | "founder";
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
          last_login_date?: string | null;
          login_streak?: number;
          lifetime_points_earned?: number;
          monthly_points_earned?: number;
          preferred_competitions?: string[] | null;
          default_var_bet_amount?: number;
          season_points?: number;
          current_season_id?: string | null;
          notif_pre_match_5min?: boolean;
          notif_var_results?: boolean;
          notif_prono_results?: boolean;
          notif_daily_digest?: boolean;
          notif_pre_match_2h?: boolean;
          notif_squad_chat?: boolean;
          notif_dm?: boolean;
          streak_freezes_owned?: number;
          streak_freezes_used_count?: number;
          equipped_avatar_id?: string | null;
          equipped_border_id?: string | null;
          equipped_effect_id?: string | null;
          role?: "user" | "moderator" | "founder";
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
          last_login_date?: string | null;
          login_streak?: number;
          lifetime_points_earned?: number;
          monthly_points_earned?: number;
          preferred_competitions?: string[] | null;
          default_var_bet_amount?: number;
          season_points?: number;
          current_season_id?: string | null;
          notif_pre_match_5min?: boolean;
          notif_var_results?: boolean;
          notif_prono_results?: boolean;
          notif_daily_digest?: boolean;
          notif_pre_match_2h?: boolean;
          notif_squad_chat?: boolean;
          notif_dm?: boolean;
          streak_freezes_owned?: number;
          streak_freezes_used_count?: number;
          equipped_avatar_id?: string | null;
          equipped_border_id?: string | null;
          equipped_effect_id?: string | null;
          role?: "user" | "moderator" | "founder";
        };
        Relationships: [];
      };
      direct_message_threads: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          user_a_read_at: string | null;
          user_b_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          user_a_read_at?: string | null;
          user_b_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_a_id?: string;
          user_b_id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          user_a_read_at?: string | null;
          user_b_read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          content: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          content?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      rate_limit_log: {
        Row: {
          id: string;
          user_id: string;
          route: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          route?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_user_id: string;
          actor_role: "user" | "moderator" | "founder";
          action_type: string;
          target_resource_type: string | null;
          target_resource_id: string | null;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          actor_role: "user" | "moderator" | "founder";
          action_type: string;
          target_resource_type?: string | null;
          target_resource_id?: string | null;
          metadata?: Record<string, unknown>;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string;
          actor_role?: "user" | "moderator" | "founder";
          action_type?: string;
          target_resource_type?: string | null;
          target_resource_id?: string | null;
          metadata?: Record<string, unknown>;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          slug: string;
          label: string;
          starts_at: string;
          ends_at: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          starts_at: string;
          ends_at: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          starts_at?: string;
          ends_at?: string;
          is_current?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      season_archives: {
        Row: {
          user_id: string;
          season_id: string;
          final_rank: number;
          final_points: number;
          final_rank_label: string;
          archived_at: string;
        };
        Insert: {
          user_id: string;
          season_id: string;
          final_rank: number;
          final_points?: number;
          final_rank_label?: string;
          archived_at?: string;
        };
        Update: {
          user_id?: string;
          season_id?: string;
          final_rank?: number;
          final_points?: number;
          final_rank_label?: string;
          archived_at?: string;
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
          grid_position: string | null;
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
          grid_position?: string | null;
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
          grid_position?: string | null;
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
          game_mode: string;
          chat_last_push_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          is_private?: boolean;
          invite_code?: string | null;
          owner_id: string;
          created_at?: string;
          game_mode?: string;
          chat_last_push_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          is_private?: boolean;
          invite_code?: string | null;
          owner_id?: string;
          created_at?: string;
          game_mode?: string;
          chat_last_push_at?: string | null;
        };
        Relationships: [];
      };
      squad_seasons: {
        Row: {
          id: string;
          squad_id: string;
          status: "pending" | "active" | "finished";
          total_rounds: number;
          current_round: number;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          status?: "pending" | "active" | "finished";
          total_rounds?: number;
          current_round?: number;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          status?: "pending" | "active" | "finished";
          total_rounds?: number;
          current_round?: number;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      squad_fixtures: {
        Row: {
          id: string;
          season_id: string;
          round_number: number;
          week_start: string;
          home_member_id: string;
          away_member_id: string;
          home_points: number | null;
          away_points: number | null;
          winner_id: string | null;
          status: "upcoming" | "active" | "finished";
        };
        Insert: {
          id?: string;
          season_id: string;
          round_number: number;
          week_start: string;
          home_member_id: string;
          away_member_id: string;
          home_points?: number | null;
          away_points?: number | null;
          winner_id?: string | null;
          status?: "upcoming" | "active" | "finished";
        };
        Update: {
          id?: string;
          season_id?: string;
          round_number?: number;
          week_start?: string;
          home_member_id?: string;
          away_member_id?: string;
          home_points?: number | null;
          away_points?: number | null;
          winner_id?: string | null;
          status?: "upcoming" | "active" | "finished";
        };
        Relationships: [];
      };
      squad_standings: {
        Row: {
          season_id: string;
          user_id: string;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          points: number;
          pronos_pts: number;
        };
        Insert: {
          season_id: string;
          user_id: string;
          played?: number;
          won?: number;
          drawn?: number;
          lost?: number;
          points?: number;
          pronos_pts?: number;
        };
        Update: {
          season_id?: string;
          user_id?: string;
          played?: number;
          won?: number;
          drawn?: number;
          lost?: number;
          points?: number;
          pronos_pts?: number;
        };
        Relationships: [];
      };
      squad_members: {
        Row: {
          user_id: string;
          squad_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          user_id: string;
          squad_id: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          user_id?: string;
          squad_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Relationships: [];
      };
      squad_messages: {
        Row: {
          id: string;
          squad_id: string;
          user_id: string | null;
          content: string;
          created_at: string;
          is_system_message: boolean;
        };
        Insert: {
          id?: string;
          squad_id: string;
          user_id?: string | null;
          content: string;
          created_at?: string;
          is_system_message?: boolean;
        };
        Update: {
          id?: string;
          squad_id?: string;
          user_id?: string | null;
          content?: string;
          created_at?: string;
          is_system_message?: boolean;
        };
        Relationships: [];
      };
      shop_items: {
        Row: {
          id: string;
          slug: string;
          category: "avatar" | "border" | "effect";
          name: string;
          description: string;
          price_pts: number;
          unlock_rank: string | null;
          asset_url: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          category: "avatar" | "border" | "effect";
          name: string;
          description?: string;
          price_pts?: number;
          unlock_rank?: string | null;
          asset_url?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          category?: "avatar" | "border" | "effect";
          name?: string;
          description?: string;
          price_pts?: number;
          unlock_rank?: string | null;
          asset_url?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_shop_inventory: {
        Row: {
          user_id: string;
          shop_item_id: string;
          purchased_at: string;
          is_equipped: boolean;
        };
        Insert: {
          user_id: string;
          shop_item_id: string;
          purchased_at?: string;
          is_equipped?: boolean;
        };
        Update: {
          user_id?: string;
          shop_item_id?: string;
          purchased_at?: string;
          is_equipped?: boolean;
        };
        Relationships: [];
      };
      user_daily_recaps: {
        Row: {
          user_id: string;
          recap_date: string;
          pronos_total: number;
          pronos_correct: number;
          pronos_exact: number;
          var_bets_total: number;
          var_bets_won: number;
          points_earned: number;
          rank_general: number | null;
          rank_squad_primary: number | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recap_date: string;
          pronos_total?: number;
          pronos_correct?: number;
          pronos_exact?: number;
          var_bets_total?: number;
          var_bets_won?: number;
          points_earned?: number;
          rank_general?: number | null;
          rank_squad_primary?: number | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          recap_date?: string;
          pronos_total?: number;
          pronos_correct?: number;
          pronos_exact?: number;
          var_bets_total?: number;
          var_bets_won?: number;
          points_earned?: number;
          rank_general?: number | null;
          rank_squad_primary?: number | null;
          dismissed_at?: string | null;
          created_at?: string;
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
      push_logs: {
        Row: {
          id: string;
          user_id: string;
          match_id: string | null;
          type:
            | "var_alert"
            | "pre_match"
            | "pre_match_2h"
            | "resolution"
            | "digest"
            | "nudge";
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id?: string | null;
          type:
            | "var_alert"
            | "pre_match"
            | "pre_match_2h"
            | "resolution"
            | "digest"
            | "nudge";
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string | null;
          type?:
            | "var_alert"
            | "pre_match"
            | "pre_match_2h"
            | "resolution"
            | "digest"
            | "nudge";
          sent_at?: string;
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
          applied_booster_id: string | null;
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
          applied_booster_id?: string | null;
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
          applied_booster_id?: string | null;
        };
        Relationships: [];
      };
      boosters_catalog: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          price_pts: number;
          effect_type: "double_xp" | "cote_plus" | "safety_net" | "vision";
          effect_value: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          price_pts?: number;
          effect_type: "double_xp" | "cote_plus" | "safety_net" | "vision";
          effect_value?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          price_pts?: number;
          effect_type?: "double_xp" | "cote_plus" | "safety_net" | "vision";
          effect_value?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_boosters_inventory: {
        Row: {
          id: string;
          user_id: string;
          booster_id: string;
          acquired_at: string;
          consumed_at: string | null;
          consumed_on_event_id: string | null;
          consumed_on_prono_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          booster_id: string;
          acquired_at?: string;
          consumed_at?: string | null;
          consumed_on_event_id?: string | null;
          consumed_on_prono_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          booster_id?: string;
          acquired_at?: string;
          consumed_at?: string | null;
          consumed_on_event_id?: string | null;
          consumed_on_prono_id?: string | null;
        };
        Relationships: [];
      };
      booster_highlights: {
        Row: {
          id: string;
          user_id: string;
          booster_id: string;
          match_id: string | null;
          base_reward: number;
          boosted_reward: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booster_id: string;
          match_id?: string | null;
          base_reward: number;
          boosted_reward: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          booster_id?: string;
          match_id?: string | null;
          base_reward?: number;
          boosted_reward?: number;
          created_at?: string;
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
      player_odds: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          odd_anytime: number | null;
          odd_first: number | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          odd_anytime?: number | null;
          odd_first?: number | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          odd_anytime?: number | null;
          odd_first?: number | null;
          synced_at?: string;
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
          applied_booster_id: string | null;
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
          applied_booster_id?: string | null;
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
          applied_booster_id?: string | null;
        };
        Relationships: [];
      };
      match_presence: {
        Row: {
          match_id: string;
          user_id: string;
          last_seen_at: string;
        };
        Insert: {
          match_id: string;
          user_id: string;
          last_seen_at?: string;
        };
        Update: {
          match_id?: string;
          user_id?: string;
          last_seen_at?: string;
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
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tweet_log: {
        Row: {
          id: string;
          market_event_id: string | null;
          match_id: string | null;
          tweet_id: string;
          tweet_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          market_event_id?: string | null;
          match_id?: string | null;
          tweet_id: string;
          tweet_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          market_event_id?: string | null;
          match_id?: string | null;
          tweet_id?: string;
          tweet_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      twitter_tokens: {
        Row: {
          id: number;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          updated_at?: string;
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
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: "user" | "moderator" | "founder";
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
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
      increment_match_score: {
        Args: {
          p_match_id: string;
          p_home_delta: number;
          p_away_delta: number;
        };
        Returns: undefined;
      };
      squad_members_for_my_squads: {
        Args: Record<string, never>;
        Returns: Array<{ squad_id: string; user_id: string }>;
      };
      create_squad_atomic: {
        Args: {
          p_name: string;
          p_is_private: boolean;
          p_owner_id: string;
        };
        Returns: Array<Database["public"]["Tables"]["squads"]["Row"]>;
      };
      activate_vision_booster: {
        Args: { p_event_id: string };
        Returns: {
          event_id: string;
          match_id: string;
          friend_choices: Record<string, number>;
          booster_consumed_at: string;
        };
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
      mark_squad_read: {
        Args: { p_squad_id: string };
        Returns: undefined;
      };
      mark_dm_thread_read: {
        Args: { p_thread_id: string };
        Returns: undefined;
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
      resolve_squad_round: {
        Args: { p_season_id: string; p_round_number: number };
        Returns: {
          resolved_fixtures: number;
          round_number: number;
          season_finished: boolean;
        };
      };
      cancel_match_pronos: {
        Args: { p_match_id: string };
        Returns: { cancelled_pronos: number; match_id: string };
      };
      reset_monthly_points: {
        Args: Record<never, never>;
        Returns: void;
      };
      count_active_users_on_match: {
        Args: { p_match_id: string; p_window_minutes?: number };
        Returns: number;
      };
      cleanup_match_presence: {
        Args: Record<never, never>;
        Returns: void;
      };
      get_friend_pronos: {
        Args: { p_match_id: string; p_user_id: string };
        Returns: Array<{
          prono_type: string;
          prono_value: string;
          friend_count: number;
        }>;
      };
      purchase_streak_freeze: {
        Args: Record<never, never>;
        Returns: {
          ok: boolean;
          remaining_balance: number;
          freezes_owned: number;
        };
      };
      get_my_stats: {
        Args: {
          p_competition_id?: string | null;
          p_team_id?: string | null;
          p_season_id?: string | null;
        };
        Returns: Array<{
          pronos_total: number;
          pronos_correct: number;
          pronos_exact: number;
          var_bets_total: number;
          var_bets_won: number;
          points_total: number;
          best_win: number;
        }>;
      };
      transition_season: {
        Args: Record<never, never>;
        Returns: {
          ok: boolean;
          old_season: string;
          new_season: string;
          archived: number;
        };
      };
      purchase_shop_item: {
        Args: { p_item_id: string };
        Returns: {
          ok: boolean;
          new_balance: number;
          item_id: string;
          free: boolean;
          error?: string;
        };
      };
      purchase_booster: {
        Args: { p_booster_id: string; p_quantity?: number };
        Returns: {
          ok: boolean;
          new_balance: number;
          quantity: number;
          booster_id: string;
          error?: string;
        };
      };
      equip_shop_item: {
        Args: { p_item_id: string };
        Returns: { ok: boolean; category: string; error?: string };
      };
      unequip_shop_item: {
        Args: { p_category: string };
        Returns: { ok: boolean; error?: string };
      };
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
export type SeasonArchiveRow =
  Database["public"]["Tables"]["season_archives"]["Row"];
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
export type SquadSeasonRow =
  Database["public"]["Tables"]["squad_seasons"]["Row"];
export type SquadFixtureRow =
  Database["public"]["Tables"]["squad_fixtures"]["Row"];
export type SquadStandingRow =
  Database["public"]["Tables"]["squad_standings"]["Row"];
export type FriendRequestRow =
  Database["public"]["Tables"]["friend_requests"]["Row"];
export type FriendRequestInsert =
  Database["public"]["Tables"]["friend_requests"]["Insert"];
export type SquadMessageRow =
  Database["public"]["Tables"]["squad_messages"]["Row"];
export type UserDailyRecapRow =
  Database["public"]["Tables"]["user_daily_recaps"]["Row"];
export type ShopItemRow = Database["public"]["Tables"]["shop_items"]["Row"];
export type UserShopInventoryRow =
  Database["public"]["Tables"]["user_shop_inventory"]["Row"];
export type BoosterCatalogRow =
  Database["public"]["Tables"]["boosters_catalog"]["Row"];
export type UserBoosterInventoryRow =
  Database["public"]["Tables"]["user_boosters_inventory"]["Row"];
export type DirectMessageThreadRow =
  Database["public"]["Tables"]["direct_message_threads"]["Row"];
export type DirectMessageRow =
  Database["public"]["Tables"]["direct_messages"]["Row"];
export type RateLimitLogRow =
  Database["public"]["Tables"]["rate_limit_log"]["Row"];
export type RateLimitLogInsert =
  Database["public"]["Tables"]["rate_limit_log"]["Insert"];

export type PlayerOddsRow = Database["public"]["Tables"]["player_odds"]["Row"];
