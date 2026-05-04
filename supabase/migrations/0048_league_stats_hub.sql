-- 0048 : Hub de Statistiques de Ligue
-- Classements, buteurs et passeurs décisifs importés via le script CLI import-league-history.ts
-- league_id / team_id / player_id = identifiants API-Football (INTEGER, pas UUID)

-- ── Table classements ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS league_standings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id    INTEGER     NOT NULL,
  season       INTEGER     NOT NULL,
  rank         INTEGER     NOT NULL,
  team_id      INTEGER     NOT NULL,
  team_name    TEXT        NOT NULL,
  team_logo    TEXT,
  points       INTEGER     NOT NULL DEFAULT 0,
  goals_diff   INTEGER     NOT NULL DEFAULT 0,
  played       INTEGER     NOT NULL DEFAULT 0,
  form         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_standings_unique
  ON league_standings (league_id, season, team_id);

ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_standings_select"
  ON league_standings FOR SELECT TO authenticated, anon USING (true);

-- ── Table meilleurs joueurs (buteurs + passeurs) ──────────────────────────────

CREATE TABLE IF NOT EXISTS league_top_players (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id              INTEGER     NOT NULL,
  season                 INTEGER     NOT NULL,
  type                   TEXT        NOT NULL CHECK (type IN ('scorer', 'assist')),
  rank                   INTEGER     NOT NULL,
  player_id              INTEGER     NOT NULL,
  player_name            TEXT        NOT NULL,
  player_photo           TEXT,
  team_logo              TEXT,
  goals_or_assists_count INTEGER     NOT NULL DEFAULT 0,
  played_matches         INTEGER     NOT NULL DEFAULT 0,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_top_players_unique
  ON league_top_players (league_id, season, type, player_id);

ALTER TABLE league_top_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_top_players_select"
  ON league_top_players FOR SELECT TO authenticated, anon USING (true);
