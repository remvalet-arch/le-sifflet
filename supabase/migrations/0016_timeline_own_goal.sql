-- Migration 0016 : Champ is_own_goal sur match_timeline_events
-- + activation UPDATE/DELETE Realtime (REPLICA IDENTITY FULL déjà en place via 0012)

ALTER TABLE match_timeline_events
  ADD COLUMN IF NOT EXISTS is_own_goal BOOLEAN NOT NULL DEFAULT FALSE;
