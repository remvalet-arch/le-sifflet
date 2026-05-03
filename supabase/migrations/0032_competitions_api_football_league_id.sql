-- Lier une compétition à l’ID ligue API-Football (Top 5, etc.) pour filtrage lobby / sync.

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS api_football_league_id integer;

COMMENT ON COLUMN public.competitions.api_football_league_id IS 'Identifiant ligue API-Football v3 (ex. 61 L1, 39 PL) ; distinct de thesportsdb_league_id.';

CREATE UNIQUE INDEX IF NOT EXISTS competitions_api_football_league_id_key
  ON public.competitions (api_football_league_id)
  WHERE api_football_league_id IS NOT NULL;
