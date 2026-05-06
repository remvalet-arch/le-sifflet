-- Migration 0065 : Login streak pour le badge "Fidèle au Poste"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS login_streak   INT  NOT NULL DEFAULT 0;
