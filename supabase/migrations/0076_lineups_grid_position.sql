-- 0076 : Ajout de grid_position aux lineups (propriété API-Football "row:col")
ALTER TABLE public.lineups
  ADD COLUMN IF NOT EXISTS grid_position text;
