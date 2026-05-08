-- FK1: Pre-match push notifications + push budget system

-- Toggle per user for pre-match pushes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_pre_match_5min BOOLEAN NOT NULL DEFAULT true;

-- Push log for dedup + daily budget enforcement
CREATE TABLE IF NOT EXISTS public.push_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id   UUID        REFERENCES public.matches(id) ON DELETE SET NULL,
  type       TEXT        NOT NULL CHECK (type IN ('var_alert','pre_match','resolution','digest','nudge')),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_logs_user_date_idx
  ON public.push_logs (user_id, sent_at DESC);

-- Prevents double pre_match push per user per match
CREATE UNIQUE INDEX IF NOT EXISTS push_logs_prematch_uniq
  ON public.push_logs (user_id, match_id) WHERE type = 'pre_match';

-- RLS: only service_role writes (cron). Users have no direct access.
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;
