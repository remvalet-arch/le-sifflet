-- Add preferred_competitions column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_competitions UUID[] DEFAULT ARRAY[]::UUID[];

-- GIN index for efficient array containment queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_competitions
  ON profiles USING GIN (preferred_competitions);

-- Backfill existing profiles that have a favorite_team_id:
-- Set preferred_competitions = [their domestic league UUID, UCL UUID]
UPDATE profiles p
SET preferred_competitions = (
  SELECT ARRAY(
    SELECT DISTINCT comp_id FROM (
      -- Domestic league from favorite team
      SELECT t.competition_id AS comp_id
      FROM teams t
      WHERE t.id = p.favorite_team_id
      UNION
      -- UCL
      SELECT c.id AS comp_id
      FROM competitions c
      WHERE c.api_football_league_id = 2
    ) sub
  )
)
WHERE p.favorite_team_id IS NOT NULL
  AND (p.preferred_competitions IS NULL OR array_length(p.preferred_competitions, 1) IS NULL);
