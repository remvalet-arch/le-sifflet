-- Timestamp de la dernière synchronisation complète des événements (timeline/buteurs)
-- pour un match. Utilisé par le match-monitor pour déclencher un heartbeat toutes les
-- 5 minutes sur les matchs en cours, indépendamment des changements de score.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS last_events_sync_at TIMESTAMPTZ DEFAULT NULL;
