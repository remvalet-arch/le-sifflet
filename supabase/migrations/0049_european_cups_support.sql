-- 0049 : Support des Coupes Européennes
-- Ajoute group_name à league_standings pour distinguer Groupe A / B / "League Phase" etc.

ALTER TABLE league_standings ADD COLUMN IF NOT EXISTS group_name TEXT;
