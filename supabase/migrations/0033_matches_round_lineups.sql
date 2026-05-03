-- Lobby MPG : libellé de journée / tour + indicateur compos (évite embed lineups lourd).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS round_short text;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS has_lineups boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.matches.round_short IS 'Libellé court de journée/tour (ex. J32), alimenté depuis API-Football league.round.';
COMMENT ON COLUMN public.matches.has_lineups IS 'True si au moins une ligne existe dans lineups pour ce match.';
