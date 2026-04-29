-- Données de démo pour le lobby (exécuter dans Supabase SQL Editor en tant que postgres,
-- ou via `supabase db reset` si configuré pour lancer ce fichier après les migrations.)

INSERT INTO public.matches (team_home, team_away, status, start_time)
VALUES
  ('Les Bleus FC', 'Roja Legends', 'finished', now() - interval '2 days'),
  ('Stadium United', 'Riverside CF', 'live', now()),
  ('North End', 'South Coast', 'upcoming', now() + interval '1 day');
