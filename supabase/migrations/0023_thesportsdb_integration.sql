-- Migration 0023 : TheSportsDB — fondations (competitions, teams, FK nullable sur players / matches)
-- Ne modifie pas les RPC existantes ni les colonnes métier de matches (home_score, team_home, …).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at (nouvelles tables uniquement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- COMPETITIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  badge_url text,
  thesportsdb_league_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competitions_tsdb_league_unique UNIQUE (thesportsdb_league_id)
);

CREATE INDEX competitions_name_idx ON public.competitions (name);

CREATE TRIGGER competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------------------------
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions (id) ON DELETE RESTRICT,
  name text NOT NULL,
  short_name text,
  logo_url text,
  color_primary text,
  color_secondary text,
  thesportsdb_team_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_tsdb_team_unique UNIQUE (thesportsdb_team_id)
);

CREATE INDEX teams_competition_id_idx ON public.teams (competition_id);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — lecture anon + authenticated (nouvelles tables)
-- ---------------------------------------------------------------------------
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitions_select_public
  ON public.competitions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY teams_select_public
  ON public.teams FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.competitions TO anon, authenticated;
GRANT SELECT ON public.teams TO anon, authenticated;

GRANT ALL ON TABLE public.competitions TO service_role;
GRANT ALL ON TABLE public.teams TO service_role;

-- ---------------------------------------------------------------------------
-- PLAYERS — colonnes relationnelles (nullable pour rétrocompat)
-- ---------------------------------------------------------------------------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS cutout_url text;

CREATE INDEX IF NOT EXISTS players_team_id_idx ON public.players (team_id);

-- ---------------------------------------------------------------------------
-- MATCHES — FK relationnelles (nullable pour rétrocompat seed / démo)
-- ---------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions (id) ON DELETE RESTRICT;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_team_id uuid REFERENCES public.teams (id) ON DELETE RESTRICT;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS away_team_id uuid REFERENCES public.teams (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS matches_competition_id_idx ON public.matches (competition_id);
CREATE INDEX IF NOT EXISTS matches_home_team_id_idx ON public.matches (home_team_id);
CREATE INDEX IF NOT EXISTS matches_away_team_id_idx ON public.matches (away_team_id);
