-- Migration 0014 : Couleurs et logos d'équipe sur matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_team_color varchar(7),
  ADD COLUMN IF NOT EXISTS away_team_color varchar(7),
  ADD COLUMN IF NOT EXISTS home_team_logo  varchar(50),
  ADD COLUMN IF NOT EXISTS away_team_logo  varchar(50);
