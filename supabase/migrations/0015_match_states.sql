-- Migration 0015 : États de match granulaires
-- Remplace 'live' par 'first_half', 'half_time', 'second_half', 'paused'

-- 1. Supprimer l'ancien constraint (libère la colonne de toute restriction)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- 2. Migrer les données AVANT d'ajouter le nouveau constraint
--    (PostgreSQL valide le CHECK sur toutes les lignes existantes au moment du ADD CONSTRAINT)
UPDATE matches SET status = 'first_half' WHERE status = 'live';
-- Filet de sécurité : toute valeur non reconnue → 'upcoming'
UPDATE matches SET status = 'upcoming'
  WHERE status NOT IN ('upcoming', 'first_half', 'half_time', 'second_half', 'paused', 'finished');

-- 3. Ajouter le nouveau constraint — toutes les lignes sont maintenant valides
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('upcoming', 'first_half', 'half_time', 'second_half', 'paused', 'finished'));
