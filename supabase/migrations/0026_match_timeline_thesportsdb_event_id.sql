-- Id TSDB par ligne timeline (idTimeline) pour dédoublonner les imports live.

ALTER TABLE public.match_timeline_events
  ADD COLUMN IF NOT EXISTS thesportsdb_event_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'match_timeline_events'
      AND c.conname = 'match_timeline_events_thesportsdb_event_id_key'
  ) THEN
    ALTER TABLE public.match_timeline_events
      ADD CONSTRAINT match_timeline_events_thesportsdb_event_id_key UNIQUE (thesportsdb_event_id);
  END IF;
END $$;
