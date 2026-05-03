-- Statistiques de match (possession, tirs, corners, fautes…) importées depuis API-Football.
-- Upsertées par le match-monitor à chaque heartbeat.

CREATE TABLE IF NOT EXISTS match_statistics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id)  ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  type        TEXT NOT NULL,             -- ex. 'Ball Possession', 'Shots on Goal'
  value       TEXT,                      -- ex. '60%', '8', null
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_statistics_unique
  ON match_statistics (match_id, team_id, type);

ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_statistics_select"
  ON match_statistics FOR SELECT TO authenticated USING (true);

-- Realtime pour mise à jour live côté UI
ALTER TABLE match_statistics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE match_statistics;

-- Colonne de traçage pour la synchro stats côté monitor
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS last_stats_sync_at TIMESTAMPTZ DEFAULT NULL;
