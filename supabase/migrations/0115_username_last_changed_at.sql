-- Track when a user last changed their username (for rate limiting: 1 change / 30 days)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_last_changed_at timestamptz DEFAULT NULL;
