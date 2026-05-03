-- Live API-Football : idempotence timeline + lien optionnel lineups → players

ALTER TABLE public.match_timeline_events
  ADD COLUMN IF NOT EXISTS api_football_event_id text;

COMMENT ON COLUMN public.match_timeline_events.api_football_event_id IS 'Clé stable événement API-Football (upsert live) ; distinct de thesportsdb_event_id.';

CREATE UNIQUE INDEX IF NOT EXISTS match_timeline_events_api_football_event_id_key
  ON public.match_timeline_events (api_football_event_id)
  WHERE api_football_event_id IS NOT NULL;

ALTER TABLE public.lineups
  ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.players (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lineups_player_id_idx ON public.lineups (player_id) WHERE player_id IS NOT NULL;

COMMENT ON COLUMN public.lineups.player_id IS 'Joueur résolu ou fantôme API-Football ; affichage inchangé si NULL.';
