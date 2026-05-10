import posthog from "posthog-js";

export type MatchTier = "top" | "mid" | "low";
export type SignupMethod = "google" | "apple" | "email";
export type ItemCategory = "cosmetic" | "booster";
export type BoosterSlug = "double_xp" | "cote_plus" | "safety_net" | "vision";
export type PronoType = "exact_score" | "scorer_allocation";
export type MarketEventType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "free_kick"
  | "corner"
  | "stoppage_ht"
  | "stoppage_ft";
export type OpeningSource = "community" | "auto";
export type NotifType =
  | "match_starting"
  | "pre_match"
  | "pre_match_2h"
  | "var_alert"
  | "resolution"
  | "digest"
  | "nudge"
  | "squad_chat"
  | "dm";
export type AdminActionType =
  | "resolve_event"
  | "force_finish_match"
  | "sync_matches"
  | "admin_match_state_update"
  | "ban_user"
  | "unban_user";

// ── PostHog v1.1 types ──────────────────────────────────────────────────────

// flash=0-15s (speed bonus ×1.25), normal=16-45s (×1.00), late=46s+ (×0.90)
export type SpeedBracket = "flash" | "normal" | "late";

// Maps contre_pied_bonus values: 20→default/evident, 30→rare, 50→tres_rare, 70→mega_rare, 100→ultra_rare
export type RarityLabel =
  | "evident"
  | "rare"
  | "tres_rare"
  | "mega_rare"
  | "ultra_rare"
  | "default"
  | null;

export type SmartMuteReason =
  | "app_visible"
  | "user_in_match_room"
  | "opt_out_preference"
  | "budget_exhausted_ios";

type AnalyticsEvents = {
  landing_viewed: {
    locale: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  signup_completed: {
    signup_method: SignupMethod;
    locale: string;
  };
  onboarding_completed: {
    favorite_team_id?: string;
    preferred_competitions_count: number;
  };

  app_opened: {
    is_match_day: boolean;
    days_since_signup: number;
    login_streak: number;
  };
  match_joined: {
    match_id: string;
    match_tier: MatchTier;
    minute_at_join: number;
    league: string;
    competition_id: string;
  };
  match_left: {
    match_id: string;
    duration_seconds: number;
    bets_placed_in_session: number;
    pronos_changes_in_session: number;
  };
  daily_streak_claimed: {
    current_streak: number;
    streak_freezes_owned: number;
    points_earned: number;
  };

  prono_placed: {
    match_id: string;
    match_tier: MatchTier;
    prono_type: PronoType;
    booster_applied: BoosterSlug | null;
    is_first_prono_of_session: boolean;
  };
  prono_resolved: {
    match_id: string;
    prono_type: PronoType;
    status: "won" | "lost";
    points_earned: number;
    booster_applied: BoosterSlug | null;
    rarity_label: RarityLabel;
    bonus_rarity_points: number;
  };

  alert_signal_submitted: {
    match_id: string;
    match_tier: MatchTier;
    event_type: MarketEventType;
    minute: number;
    user_trust_score: number;
  };
  market_opened: {
    match_id: string;
    market_id: string;
    market_type: MarketEventType;
    opening_source: OpeningSource;
    minute: number;
    initiators_count: number;
  };
  bet_placed: {
    match_id: string;
    market_id: string;
    market_type: MarketEventType;
    chosen_option: string;
    amount_staked: number;
    booster_applied: BoosterSlug | null;
    is_first_bet_of_session: boolean;
    bet_rank_in_session: number;
    via_quick_bet: boolean;
    speed_bracket: SpeedBracket;
    delay_seconds: number;
  };
  bet_resolved: {
    match_id: string;
    market_id: string;
    status: "won" | "lost";
    reward_received: number;
    braquage_bonus: number;
    booster_applied: BoosterSlug | null;
  };
  vision_booster_activated: {
    match_id: string;
    market_id: string;
    friend_choices_count: number;
  };

  shop_purchase: {
    item_category: ItemCategory;
    item_slug: string;
    sifflets_spent: number;
    purchase_quantity: number;
  };
  refill_claimed: {
    sifflets_received: number;
    balance_before: number;
  };

  squad_created: {
    squad_id: string;
    game_mode: "classic" | "braquage";
    is_private: boolean;
  };
  squad_joined: {
    squad_id: string;
    via: "invite_code" | "public_browse";
  };
  squad_message_sent: {
    squad_id: string;
    is_first_message_of_session: boolean;
  };
  dm_sent: {
    is_first_message_in_thread: boolean;
  };
  friend_request_sent: {
    is_first_friend_request: boolean;
  };

  push_opted_in: {
    permission_status: "granted" | "denied" | "default";
  };
  notif_clicked: {
    notif_type: NotifType;
    match_id?: string;
  };

  admin_action_performed: {
    action_type: AdminActionType;
    target_resource_type?: string;
    target_resource_id?: string;
    actor_role: "moderator" | "founder";
  };

  alert_threshold_reached: {
    match_id: string;
    match_tier: MatchTier;
    event_type: MarketEventType;
    signals_count: number;
    active_audience: number;
    threshold_required: number;
    time_to_threshold_seconds: number;
  };

  notif_suppressed_by_smart_mute: {
    notif_type: NotifType;
    reason: SmartMuteReason;
    match_id?: string;
  };
};

export function track<K extends keyof AnalyticsEvents>(
  event: K,
  properties: AnalyticsEvents[K],
): void {
  if (typeof window === "undefined") return;
  if (!posthog.has_opted_in_capturing()) return;
  posthog.capture(event, properties as Record<string, unknown>);
}

export function trackBetPlaced(p: AnalyticsEvents["bet_placed"]) {
  track("bet_placed", p);
}

export function trackPronoPlaced(p: AnalyticsEvents["prono_placed"]) {
  track("prono_placed", p);
}

export function trackMarketOpened(p: AnalyticsEvents["market_opened"]) {
  track("market_opened", p);
}

// ── PostHog v1.1 helpers ────────────────────────────────────────────────────

export function computeSpeedBracket(delaySeconds: number): SpeedBracket {
  if (delaySeconds <= 15) return "flash";
  if (delaySeconds <= 45) return "normal";
  return "late";
}

// Maps contre_pied_bonus integer (from pronos row) to a RarityLabel.
// 0 → null (no bonus earned). 20 → "default" (covers both "evident" >30% and
// the <5-players fallback which also gives +20pts). 30/50/70/100 → rare grades.
export function rarityBonusToLabel(bonus: number): RarityLabel {
  if (bonus === 0) return null;
  if (bonus === 30) return "rare";
  if (bonus === 50) return "tres_rare";
  if (bonus === 70) return "mega_rare";
  if (bonus === 100) return "ultra_rare";
  return "default"; // 20pts — "evident" (>30%) or <5 total correct 1N2
}
