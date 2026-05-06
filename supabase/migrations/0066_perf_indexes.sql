-- Performance indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_pronos_user_match
  ON pronos(user_id, match_id);

CREATE INDEX IF NOT EXISTS idx_pronos_match_status
  ON pronos(match_id, status);

CREATE INDEX IF NOT EXISTS idx_bets_user_placed
  ON bets(user_id, placed_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_signals_match_type
  ON alert_signals(match_id, action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_market_events_match_status
  ON market_events(match_id, status);
