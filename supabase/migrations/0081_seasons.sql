-- ═══════════════════════════════════════════════════════════════════════════
-- Eco-1 : Saisons mensuelles
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Table seasons ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT        NOT NULL UNIQUE,    -- ex: '2026-05'
  label      TEXT        NOT NULL,           -- ex: 'Saison de Mai 2026'
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read_all" ON public.seasons FOR SELECT USING (true);

-- 2. Colonnes season_points + current_season_id sur profiles ──────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS season_points     INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_season_id UUID REFERENCES public.seasons(id);

CREATE INDEX IF NOT EXISTS idx_profiles_season_points ON public.profiles (season_points DESC);

-- 3. Table season_archives ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.season_archives (
  user_id          UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  season_id        UUID        NOT NULL REFERENCES public.seasons(id)   ON DELETE CASCADE,
  final_rank       INT         NOT NULL,
  final_points     INT         NOT NULL DEFAULT 0,
  final_rank_label TEXT        NOT NULL DEFAULT 'Participant',
  archived_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);

ALTER TABLE public.season_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_archives_read_own" ON public.season_archives
  FOR SELECT USING (user_id = auth.uid());

-- 4. Seed saison courante (Mai 2026) ──────────────────────────────────────────
INSERT INTO public.seasons (slug, label, starts_at, ends_at, is_current)
VALUES (
  '2026-05',
  'Saison de Mai 2026',
  '2026-05-01 00:00:00+00',
  '2026-05-31 23:59:59+00',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Lier tous les profils existants à la saison courante
UPDATE public.profiles
SET current_season_id = (SELECT id FROM public.seasons WHERE is_current = true LIMIT 1)
WHERE current_season_id IS NULL;

-- 5. Trigger : sync season_points quand lifetime_points_earned augmente ────────
-- Cela évite de modifier les RPCs existantes (resolve_event_parimutuel, etc.)
CREATE OR REPLACE FUNCTION public.trg_sync_season_points_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lifetime_points_earned > OLD.lifetime_points_earned THEN
    NEW.season_points := NEW.season_points + (NEW.lifetime_points_earned - OLD.lifetime_points_earned);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_season_points ON public.profiles;
CREATE TRIGGER trg_sync_season_points
  BEFORE UPDATE OF lifetime_points_earned ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_season_points_fn();

-- 6. RPC transition_season() ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transition_season()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_season      RECORD;
  v_new_season_id   UUID;
  v_new_slug        TEXT;
  v_new_label       TEXT;
  v_new_starts      TIMESTAMPTZ;
  v_new_ends        TIMESTAMPTZ;
  v_row             RECORD;
  v_rank            INT := 0;
  v_archived        INT := 0;
BEGIN
  -- 1. Saison courante
  SELECT * INTO v_old_season FROM public.seasons WHERE is_current = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No current season found');
  END IF;

  -- 2. Archiver les profils par season_points décroissants
  FOR v_row IN (
    SELECT id, season_points FROM public.profiles
    WHERE season_points > 0
    ORDER BY season_points DESC
  ) LOOP
    v_rank := v_rank + 1;
    INSERT INTO public.season_archives (user_id, season_id, final_rank, final_points, final_rank_label)
    VALUES (
      v_row.id,
      v_old_season.id,
      v_rank,
      v_row.season_points,
      CASE
        WHEN v_rank = 1 THEN 'Champion'
        WHEN v_rank <= 3 THEN 'Top 3'
        WHEN v_rank <= 10 THEN 'Top 10'
        ELSE 'Participant'
      END
    )
    ON CONFLICT (user_id, season_id) DO NOTHING;
    v_archived := v_archived + 1;
  END LOOP;

  -- 3. Reporter 10% des season_points dans la nouvelle saison (floor)
  UPDATE public.profiles
  SET season_points = FLOOR(season_points::numeric * 0.1)::int
  WHERE season_points > 0;

  -- 4. Calculer les dates de la prochaine saison (mois suivant)
  v_new_starts := date_trunc('month', v_old_season.ends_at + INTERVAL '1 second');
  v_new_ends   := (v_new_starts + INTERVAL '1 month') - INTERVAL '1 second';
  v_new_slug   := to_char(v_new_starts, 'YYYY-MM');
  v_new_label  := 'Saison de ' ||
    initcap(to_char(v_new_starts AT TIME ZONE 'Europe/Paris', 'TMMonth')) ||
    ' ' || to_char(v_new_starts, 'YYYY');

  -- 5. Fermer l'ancienne saison
  UPDATE public.seasons SET is_current = false WHERE id = v_old_season.id;

  -- 6. Créer la nouvelle saison
  INSERT INTO public.seasons (slug, label, starts_at, ends_at, is_current)
  VALUES (v_new_slug, v_new_label, v_new_starts, v_new_ends, true)
  RETURNING id INTO v_new_season_id;

  -- 7. Mettre à jour tous les profils
  UPDATE public.profiles SET current_season_id = v_new_season_id;

  RETURN jsonb_build_object(
    'ok',         true,
    'old_season', v_old_season.slug,
    'new_season', v_new_slug,
    'archived',   v_archived
  );
END;
$$;
