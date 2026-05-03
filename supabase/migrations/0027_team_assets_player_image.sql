-- Cosmétique TSDB : couleurs maillot domicile/extérieur, stade, portrait joueur

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_color_1 text,
  ADD COLUMN IF NOT EXISTS team_color_2 text,
  ADD COLUMN IF NOT EXISTS stadium_name text,
  ADD COLUMN IF NOT EXISTS stadium_thumb text;

COMMENT ON COLUMN public.teams.team_color_1 IS 'Couleur maillot domicile (TSDB strTeamColour1 / strColour1)';
COMMENT ON COLUMN public.teams.team_color_2 IS 'Couleur maillot extérieur (TSDB strTeamColour2 / strColour2)';
COMMENT ON COLUMN public.teams.stadium_name IS 'Nom du stade (TSDB strStadium)';
COMMENT ON COLUMN public.teams.stadium_thumb IS 'URL vignette stade (TSDB strStadiumThumb)';

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.players.image_url IS 'Photo joueur détourée ou portrait (TSDB strCutout / strThumb)';

-- Rétrocompat : aligner les nouvelles colonnes sur les champs déjà remplis si besoin
UPDATE public.teams
SET team_color_1 = color_primary
WHERE team_color_1 IS NULL AND color_primary IS NOT NULL;

UPDATE public.teams
SET team_color_2 = color_secondary
WHERE team_color_2 IS NULL AND color_secondary IS NOT NULL;

UPDATE public.players
SET image_url = cutout_url
WHERE image_url IS NULL AND cutout_url IS NOT NULL;
