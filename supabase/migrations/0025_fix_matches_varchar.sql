-- Migration 0025 : élargir les colonnes VARCHAR restrictives sur `matches`
-- (URLs TheSportsDB / badges souvent > 50 caractères — upsert sync-matches).
-- team_home / team_away / status / thesportsdb_event_id : déjà text dans les migrations antérieures.

ALTER TABLE public.matches
  ALTER COLUMN home_team_logo TYPE text USING home_team_logo::text;

ALTER TABLE public.matches
  ALTER COLUMN away_team_logo TYPE text USING away_team_logo::text;

-- Couleurs API (hex ou libellés) : varchar(7) trop court pour certains flux
ALTER TABLE public.matches
  ALTER COLUMN home_team_color TYPE text USING home_team_color::text;

ALTER TABLE public.matches
  ALTER COLUMN away_team_color TYPE text USING away_team_color::text;
