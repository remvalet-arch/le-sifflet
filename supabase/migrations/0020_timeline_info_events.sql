-- Migration 0020 : Événements 'info' dans la timeline
-- Utilisé pour les changements d'état du match (coup d'envoi, mi-temps, fin…)

-- 1. Drop ancien constraint event_type
ALTER TABLE match_timeline_events DROP CONSTRAINT IF EXISTS match_timeline_events_event_type_check;

-- 2. Nouveau constraint incluant 'info'
ALTER TABLE match_timeline_events ADD CONSTRAINT match_timeline_events_event_type_check
  CHECK (event_type IN ('goal', 'yellow_card', 'red_card', 'substitution', 'info'));

-- 3. Colonne details optionnelle (texte libre pour les événements de type 'info')
ALTER TABLE match_timeline_events ADD COLUMN IF NOT EXISTS details TEXT DEFAULT NULL;
