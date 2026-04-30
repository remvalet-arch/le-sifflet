-- Migration 0019 : Table players (effectifs globaux TheSportsDB)
-- + thesportsdb_event_id sur matches pour l'upsert

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS thesportsdb_event_id TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS public.players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesportsdb_id      TEXT UNIQUE NOT NULL,
  team_thesportsdb_id TEXT,
  team_name           TEXT NOT NULL,
  player_name         TEXT NOT NULL,
  position            TEXT CHECK (position IN ('G', 'D', 'M', 'A')),
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_authenticated" ON public.players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "players_service_write" ON public.players
  FOR ALL TO service_role USING (true);
