-- Table légère pour le rate limiting des routes sans table naturelle
-- (claim-daily-streak, claim-rsa). Les autres routes utilisent leur table métier.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route       text        NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own rate_limit_log"
  ON rate_limit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own rate_limit_log"
  ON rate_limit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index composite pour les requêtes de fenêtre glissante
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_lookup
  ON rate_limit_log(user_id, route, created_at DESC);
