-- Migration 0064: Add game_mode to squads
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS game_mode TEXT NOT NULL DEFAULT 'classic' CHECK (game_mode IN ('classic', 'braquage'));
