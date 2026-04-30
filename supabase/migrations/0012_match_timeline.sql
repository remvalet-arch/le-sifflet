-- Migration 0012 : Timeline des événements officiels d'un match

CREATE TABLE IF NOT EXISTS public.match_timeline_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('goal', 'yellow_card', 'red_card', 'substitution')),
  minute      integer NOT NULL CHECK (minute >= 0 AND minute <= 120),
  team_side   text NOT NULL CHECK (team_side IN ('home', 'away')),
  player_name text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_timeline_events REPLICA IDENTITY FULL;

CREATE POLICY "timeline_select" ON public.match_timeline_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "timeline_service_write" ON public.match_timeline_events
  FOR ALL TO service_role USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_timeline_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_timeline_events;
  END IF;
END $$;
