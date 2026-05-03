-- API-Football (live) : identifiants externes, nullable + unicité quand renseigné

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS api_football_id integer;

COMMENT ON COLUMN public.teams.api_football_id IS 'Identifiant équipe API-Football (v3) ; TSDB reste cosmétique.';

CREATE UNIQUE INDEX IF NOT EXISTS teams_api_football_id_key
  ON public.teams (api_football_id)
  WHERE api_football_id IS NOT NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS api_football_id integer;

COMMENT ON COLUMN public.matches.api_football_id IS 'Identifiant fixture API-Football (v3) pour sync live.';

CREATE UNIQUE INDEX IF NOT EXISTS matches_api_football_id_key
  ON public.matches (api_football_id)
  WHERE api_football_id IS NOT NULL;
