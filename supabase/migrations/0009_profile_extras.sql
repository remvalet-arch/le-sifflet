-- Migration 0009 : Refill quotidien + Onboarding flag

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_refill_date timestamptz,
  ADD COLUMN IF NOT EXISTS has_onboarded boolean NOT NULL DEFAULT false;
