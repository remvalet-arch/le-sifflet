-- Migration 0106 : Ajout de la colonne role sur profiles
-- Remplace le proxy trust_score >= 150 pour l'accès admin.
-- trust_score reste pour l'usage Waze (karma communautaire).

-- ── 1. Enum user_role ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'founder');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 2. Colonne role sur profiles ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'user';

-- ── 3. Index partiel pour lookups admin ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role)
  WHERE role != 'user';
