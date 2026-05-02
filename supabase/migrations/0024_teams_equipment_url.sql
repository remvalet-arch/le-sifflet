-- Maillots / équipement (TheSportsDB strEquipment) — optionnel pour la vitrine

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS equipment_url text;
