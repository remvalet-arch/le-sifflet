-- Migration 0040 : Abonnements aux matchs (Smart Notifications)
-- Un pari sur un match crée automatiquement une subscription.
-- smart_mute = true → pas de push notifications pour ce match.

CREATE TABLE IF NOT EXISTS public.match_subscriptions (
  user_id    uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  match_id   uuid        NOT NULL REFERENCES public.matches  (id) ON DELETE CASCADE,
  smart_mute boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX match_subscriptions_match_idx
  ON public.match_subscriptions (match_id);

ALTER TABLE public.match_subscriptions ENABLE ROW LEVEL SECURITY;

-- L'utilisateur gère ses propres abonnements
CREATE POLICY "match_subscriptions_own"
  ON public.match_subscriptions
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.match_subscriptions TO authenticated;
GRANT ALL ON public.match_subscriptions TO service_role;
