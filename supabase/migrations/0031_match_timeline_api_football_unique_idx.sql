-- Upsert Supabase onConflict('api_football_event_id') : index UNIQUE partiel explicite
-- (remplace le nom 0030 si déjà appliqué ; idempotent)

DROP INDEX IF EXISTS public.match_timeline_events_api_football_event_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_api_football_event_id
  ON public.match_timeline_events (api_football_event_id)
  WHERE api_football_event_id IS NOT NULL;
