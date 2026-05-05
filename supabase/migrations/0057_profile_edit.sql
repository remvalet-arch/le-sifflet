-- 0057 : Personnalisation du profil joueur
-- Ajoute favorite_team_id (FK vers teams) sur profiles.
-- L'UPDATE des champs non-sensibles (username, avatar_url, favorite_team_id)
-- est géré via la route PATCH /api/profile (admin client, server-side).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS favorite_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
