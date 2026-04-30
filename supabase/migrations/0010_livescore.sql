-- Migration 0010 : LiveScore (scores + minute) + Compositions

-- 1. Colonnes score sur matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS away_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_minute integer; -- NULL = pas encore commencé

-- 2. Table lineups (compositions)
CREATE TABLE IF NOT EXISTS public.lineups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_name  text NOT NULL,
  team_side    text NOT NULL CHECK (team_side IN ('home', 'away')),
  position     text NOT NULL DEFAULT 'M' CHECK (position IN ('G', 'D', 'M', 'A')),
  status       text NOT NULL DEFAULT 'starter' CHECK (status IN ('starter', 'bench')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lineups_select" ON public.lineups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lineups_service_write" ON public.lineups
  FOR ALL TO service_role USING (true);
