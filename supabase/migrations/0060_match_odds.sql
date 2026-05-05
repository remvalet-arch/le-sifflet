-- 0060 : Colonnes cotes 1N2 sur matches (marché "Match Winner" depuis API-Football)
-- Déjà ajoutées manuellement en prod → idempotent via IF NOT EXISTS.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS odds_home numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS odds_draw numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS odds_away numeric(5,2) DEFAULT NULL;
