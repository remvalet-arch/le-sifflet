-- tweet_log: prevents duplicate tweets per market event
CREATE TABLE IF NOT EXISTS tweet_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_event_id uuid REFERENCES market_events(id) ON DELETE SET NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  tweet_id text NOT NULL,
  tweet_type text NOT NULL CHECK (tweet_type IN ('event_open', 'event_resolved', 'post_match')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tweet_log_market_event_id_idx ON tweet_log(market_event_id);
CREATE INDEX IF NOT EXISTS tweet_log_match_id_tweet_type_idx ON tweet_log(match_id, tweet_type);

-- twitter_tokens: singleton row storing OAuth 2.0 tokens (auto-refreshed by crons)
CREATE TABLE IF NOT EXISTS twitter_tokens (
  id int PRIMARY KEY DEFAULT 1,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tweet_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_tokens ENABLE ROW LEVEL SECURITY;

-- No public access — service_role only via createAdminClient()
