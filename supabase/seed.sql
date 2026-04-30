-- Seed réaliste — Fin de saison Mai 2026
-- Exécuter dans Supabase SQL Editor (ou via `supabase db reset`)
-- Les timestamps sont en UTC (Paris = UTC+2 en été)

TRUNCATE public.matches RESTART IDENTITY CASCADE;

-- ── MATCHS ──────────────────────────────────────────────────────────────────

INSERT INTO public.matches
  (team_home, team_away, status, start_time, home_score, away_score, match_minute,
   home_team_color, away_team_color, home_team_logo, away_team_logo)
VALUES
  -- Ligue 1 — 32ème journée
  (
    'Paris Saint-Germain F.C.', 'FC Lorient',
    'upcoming', '2026-05-02T15:00:00Z', 0, 0, NULL,
    '#004170', '#F47920', '🔴🔵', '🟠⚫'
  ),
  (
    'OGC Nice', 'RC Lens',
    'upcoming', '2026-05-02T19:05:00Z', 0, 0, NULL,
    '#DC052D', '#FFD700', NULL, NULL
  ),
  (
    'Olympique Lyonnais', 'Stade Rennais F.C.',
    'upcoming', '2026-05-03T18:45:00Z', 0, 0, NULL,
    '#0057A8', '#D0021B', NULL, NULL
  ),

  -- Ligue des Champions — Demi-finales retour
  (
    'Arsenal F.C.', 'Atlético Madrid',
    'upcoming', '2026-05-05T19:00:00Z', 0, 0, NULL,
    '#EF0107', '#CE3524', NULL, NULL
  ),
  (
    'FC Bayern Munich', 'Paris Saint-Germain F.C.',
    'upcoming', '2026-05-06T19:00:00Z', 0, 0, NULL,
    '#DC052D', '#004170', NULL, '🔴🔵'
  ),

  -- Terminé — Demi-finale aller UCL (PSG 5-4 Bayern)
  (
    'Paris Saint-Germain F.C.', 'FC Bayern Munich',
    'finished', '2026-04-28T19:00:00Z', 5, 4, NULL,
    '#004170', '#DC052D', '🔴🔵', NULL
  ),

  -- En direct — Demi-finale aller UCL (Atléti 1-1 Arsenal, 88')
  (
    'Atlético Madrid', 'Arsenal F.C.',
    'live', '2026-04-29T19:00:00Z', 1, 1, 88,
    '#CE3524', '#EF0107', NULL, NULL
  );

-- ── COMPOSITIONS : PSG vs LORIENT ───────────────────────────────────────────
-- Utilise un CTE pour résoudre le match_id sans connaître l'UUID à l'avance.

WITH match AS (
  SELECT id FROM public.matches
  WHERE team_home = 'Paris Saint-Germain F.C.'
    AND team_away = 'FC Lorient'
  LIMIT 1
)
INSERT INTO public.lineups (match_id, player_name, team_side, position, status)
SELECT
  (SELECT id FROM match),
  v.player_name, v.team_side, v.position, v.status
FROM (VALUES
  -- PSG Titulaires
  ('Donnarumma',   'home', 'G', 'starter'),
  ('Hakimi',       'home', 'D', 'starter'),
  ('Marquinhos',   'home', 'D', 'starter'),
  ('Hernandez',    'home', 'D', 'starter'),
  ('Nuno Mendes',  'home', 'D', 'starter'),
  ('Vitinha',      'home', 'M', 'starter'),
  ('Zaïre-Emery',  'home', 'M', 'starter'),
  ('Fabián Ruiz',  'home', 'M', 'starter'),
  ('Dembélé',      'home', 'A', 'starter'),
  ('Barcola',      'home', 'A', 'starter'),
  ('Ramos',        'home', 'A', 'starter'),
  -- PSG Remplaçants
  ('Kolo Muani',   'home', 'A', 'bench'),
  ('Asensio',      'home', 'A', 'bench'),
  ('Ugarte',       'home', 'M', 'bench'),
  ('Danilo',       'home', 'D', 'bench'),

  -- Lorient Titulaires
  ('Mvogo',        'away', 'G', 'starter'),
  ('Talbi',        'away', 'D', 'starter'),
  ('Touré',        'away', 'D', 'starter'),
  ('Mendy',        'away', 'D', 'starter'),
  ('Kalulu',       'away', 'D', 'starter'),
  ('Abergel',      'away', 'M', 'starter'),
  ('Ponceau',      'away', 'M', 'starter'),
  ('Louza',        'away', 'M', 'starter'),
  ('Bamba',        'away', 'A', 'starter'),
  ('Bouanani',     'away', 'A', 'starter'),
  -- Lorient Remplaçants
  ('Bakayoko',     'away', 'M', 'bench'),
  ('Dieng',        'away', 'A', 'bench'),
  ('Laporte',      'away', 'D', 'bench')
) AS v(player_name, team_side, position, status);
