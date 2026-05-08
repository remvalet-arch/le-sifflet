-- Push-1: Additional notification toggle columns + extended push_log types

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_var_results    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_prono_results  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_daily_digest   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_pre_match_2h   BOOLEAN NOT NULL DEFAULT true;

-- Extend push_logs.type to include new types
ALTER TABLE public.push_logs
  DROP CONSTRAINT IF EXISTS push_logs_type_check;

ALTER TABLE public.push_logs
  ADD CONSTRAINT push_logs_type_check
  CHECK (type IN ('var_alert','pre_match','pre_match_2h','resolution','digest','nudge'));

-- Prevents double pre_match_2h push per user per match
CREATE UNIQUE INDEX IF NOT EXISTS push_logs_prematch2h_uniq
  ON public.push_logs (user_id, match_id) WHERE type = 'pre_match_2h';
