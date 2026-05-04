-- 0054 : Rattrapage — s'assure que match_subscriptions existe (idempotent)
-- À appliquer si la migration 0040 n'a pas été passée en production.

CREATE TABLE IF NOT EXISTS public.match_subscriptions (
  user_id    UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  match_id   UUID        NOT NULL REFERENCES public.matches  (id) ON DELETE CASCADE,
  smart_mute BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS match_subscriptions_match_idx
  ON public.match_subscriptions (match_id);

ALTER TABLE public.match_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'match_subscriptions' AND policyname = 'match_subscriptions_own'
  ) THEN
    CREATE POLICY "match_subscriptions_own"
      ON public.match_subscriptions
      FOR ALL TO authenticated
      USING  (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_subscriptions TO authenticated;
GRANT ALL ON public.match_subscriptions TO service_role;
