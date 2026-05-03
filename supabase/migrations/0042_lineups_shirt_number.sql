-- Numéro de maillot API-Football (fixtures/lineups → player.number) pour affichage sur le terrain.
ALTER TABLE public.lineups
  ADD COLUMN IF NOT EXISTS shirt_number text;

COMMENT ON COLUMN public.lineups.shirt_number IS 'Maillot API-Football ; NULL si absent — fallback initiales côté UI.';
