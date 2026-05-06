-- 0069 : Mode Championnat 1v1 — squad_seasons, squad_fixtures, squad_standings
-- Tables préfixées "squad_" pour éviter tout conflit avec league_standings (classements foot API-Football)

-- ── 1. squad_seasons ───────────────────────────────────────────────────────────
CREATE TABLE public.squad_seasons (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id       uuid        NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'active', 'finished')),
  total_rounds   integer     NOT NULL DEFAULT 0,
  current_round  integer     NOT NULL DEFAULT 0,
  started_at     timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 2. squad_fixtures ──────────────────────────────────────────────────────────
-- Une confrontation entre deux membres pour une semaine donnée
CREATE TABLE public.squad_fixtures (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id        uuid    NOT NULL REFERENCES public.squad_seasons(id) ON DELETE CASCADE,
  round_number     integer NOT NULL,
  week_start       date    NOT NULL,   -- Lundi de la semaine (UTC)
  home_member_id   uuid    NOT NULL REFERENCES public.profiles(id),
  away_member_id   uuid    NOT NULL REFERENCES public.profiles(id),
  home_points      integer,            -- NULL = non résolu
  away_points      integer,
  winner_id        uuid    REFERENCES public.profiles(id),  -- NULL = nul ou en cours
  status           text    NOT NULL DEFAULT 'upcoming'
                           CHECK (status IN ('upcoming', 'active', 'finished'))
);

-- ── 3. squad_standings ─────────────────────────────────────────────────────────
CREATE TABLE public.squad_standings (
  season_id   uuid    NOT NULL REFERENCES public.squad_seasons(id) ON DELETE CASCADE,
  user_id     uuid    NOT NULL REFERENCES public.profiles(id),
  played      integer NOT NULL DEFAULT 0,
  won         integer NOT NULL DEFAULT 0,
  drawn       integer NOT NULL DEFAULT 0,
  lost        integer NOT NULL DEFAULT 0,
  points      integer NOT NULL DEFAULT 0,   -- 3W + 1D + 0L
  pronos_pts  integer NOT NULL DEFAULT 0,   -- total points pronos accumulés (goal average)
  PRIMARY KEY (season_id, user_id)
);

-- ── 4. Index ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_squad_seasons_squad    ON public.squad_seasons(squad_id);
CREATE INDEX idx_squad_fixtures_season  ON public.squad_fixtures(season_id, round_number);
CREATE INDEX idx_squad_fixtures_week    ON public.squad_fixtures(week_start);
CREATE INDEX idx_squad_standings_season ON public.squad_standings(season_id, points DESC);

-- ── 5. RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.squad_seasons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_fixtures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_seasons_select" ON public.squad_seasons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_members sm
    WHERE sm.squad_id = squad_seasons.squad_id AND sm.user_id = auth.uid()
  ));

CREATE POLICY "squad_fixtures_select" ON public.squad_fixtures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_seasons ss
    JOIN  public.squad_members sm ON sm.squad_id = ss.squad_id
    WHERE ss.id = squad_fixtures.season_id AND sm.user_id = auth.uid()
  ));

CREATE POLICY "squad_standings_select" ON public.squad_standings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_seasons ss
    JOIN  public.squad_members sm ON sm.squad_id = ss.squad_id
    WHERE ss.id = squad_standings.season_id AND sm.user_id = auth.uid()
  ));
