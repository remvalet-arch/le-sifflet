-- Indexes manquants sur des tables très lues (LOGGER sprint)
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id
  ON user_badges(badge_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id
  ON friend_requests(receiver_id);

CREATE INDEX IF NOT EXISTS idx_push_logs_user_id
  ON push_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_recaps_user_id
  ON user_daily_recaps(user_id);

-- Index composite pour "50 derniers messages de ce thread, du plus récent au plus ancien"
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_sent
  ON direct_messages(thread_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_tweet_log_match_id
  ON tweet_log(match_id);
