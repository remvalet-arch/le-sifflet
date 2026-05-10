-- ─────────────────────────────────────────────────────────────────────────────
-- 0112_prono_reward_overhaul.sql
-- Refonte complète du système de récompense des pronos + speed bonus VAR
--
-- 1. place_match_prono v5
--    - exact_score  : reward_amount = convertOddToPoints(odd_1N2, 220) depuis matches
--    - scorer_alloc : JSON enrichi avec pts par joueur depuis player_odds (fallback position)
--    - reward_amount mis à jour sur upsert
--
-- 2. resolve_match_pronos v5
--    - 1N2 correct (pas exact score)  → reward_amount (odds stockés)
--    - Exact score correct             → reward_amount × 2 + bonus_rarité
--    - Bonus rarité (parmi 1N2 ok, % ayant trouvé l'exact score) :
--        > 30%   → +20 pts  (évident)
--        20-30%  → +30 pts  (rare)
--        5-20%   → +50 pts  (très rare)
--        0.5-5%  → +70 pts  (méga rare)
--        < 0.5%  → +100 pts (ultra rare)
--    - scorer_allocation : pts par joueur × buts crédités (LEAST(prédit, réel))
--    - lifetime_points_earned restauré (régression 0111)
--
-- 3. resolve_event_parimutuel v3 — speed bonus VAR
--    - Parieurs rapides (0-15s) → reward × 1.25
--    - Normal (16-45s)          → reward × 1.00
--    - Tardif (46-90s)          → reward × 0.90
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. place_match_prono v5
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.place_match_prono(
  p_match_id     UUID,
  p_home_score   INT,
  p_away_score   INT,
  p_scorers_json JSONB DEFAULT NULL,
  p_booster_id   UUID  DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           UUID;
  v_score             TEXT;
  v_prono_id          UUID;
  v_inv_id            UUID;
  v_booster_type      TEXT;

  v_odds_home         NUMERIC;
  v_odds_draw         NUMERIC;
  v_odds_away         NUMERIC;
  v_implied_1n2       TEXT;
  v_implied_odd       NUMERIC;
  v_base_reward       INTEGER;

  v_enriched_json     JSONB;
  v_scorer_total_pts  INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matches WHERE id = p_match_id AND status = 'upcoming'
  ) THEN
    RAISE EXCEPTION 'Ce match n''est plus disponible pour les pronostics';
  END IF;

  -- ── Validation booster ────────────────────────────────────────────────────
  IF p_booster_id IS NOT NULL THEN
    SELECT bc.effect_type INTO v_booster_type
    FROM boosters_catalog bc WHERE bc.id = p_booster_id AND bc.is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Booster non disponible'; END IF;
    IF v_booster_type = 'vision' THEN RAISE EXCEPTION 'Ce booster ne s''applique pas aux pronostics'; END IF;

    SELECT id INTO v_inv_id
    FROM user_boosters_inventory
    WHERE user_id = v_user_id AND booster_id = p_booster_id AND consumed_at IS NULL
    LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Booster non possédé'; END IF;
  END IF;

  -- ── Calcul reward_amount pour exact_score depuis les odds du match ─────────
  SELECT odds_home, odds_draw, odds_away
  INTO v_odds_home, v_odds_draw, v_odds_away
  FROM public.matches WHERE id = p_match_id;

  v_implied_1n2 := CASE
    WHEN p_home_score > p_away_score THEN 'H'
    WHEN p_home_score = p_away_score THEN 'D'
    ELSE 'A'
  END;

  v_implied_odd := CASE v_implied_1n2
    WHEN 'H' THEN NULLIF(v_odds_home, 0)
    WHEN 'D' THEN NULLIF(v_odds_draw, 0)
    ELSE           NULLIF(v_odds_away, 0)
  END;

  -- convertOddToPoints(odd, 220) — plancher 10 pts, fallback 50 si pas d'odds
  v_base_reward := CASE
    WHEN v_implied_odd IS NOT NULL AND v_implied_odd >= 1.0
    THEN GREATEST(10, ROUND(220.0 * (1.0 - 1.0 / v_implied_odd))::integer)
    ELSE 50
  END;

  v_score := p_home_score::TEXT || '-' || p_away_score::TEXT;

  INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount, applied_booster_id)
  VALUES (p_match_id, v_user_id, 'exact_score', v_score, v_base_reward, p_booster_id)
  ON CONFLICT (match_id, user_id) WHERE prono_type = 'exact_score'
  DO UPDATE SET
    prono_value        = EXCLUDED.prono_value,
    reward_amount      = EXCLUDED.reward_amount,
    placed_at          = NOW(),
    applied_booster_id = EXCLUDED.applied_booster_id
  RETURNING id INTO v_prono_id;

  -- ── Enrichissement scorer_allocation avec pts par joueur ──────────────────
  IF p_scorers_json IS NOT NULL THEN
    -- Pour chaque slot buteur (home + away), récupère odd_anytime depuis player_odds
    -- Fallback position : A=3.5, M=7.0, D=15.0, G=25.0
    SELECT
      jsonb_build_object(
        'home',
        COALESCE(
          jsonb_agg(
            jsonb_build_object('name', player_name, 'goals', goals, 'pts', pts_per_goal)
          ) FILTER (WHERE side = 'home'),
          '[]'::jsonb
        ),
        'away',
        COALESCE(
          jsonb_agg(
            jsonb_build_object('name', player_name, 'goals', goals, 'pts', pts_per_goal)
          ) FILTER (WHERE side = 'away'),
          '[]'::jsonb
        )
      ),
      COALESCE(SUM(goals * pts_per_goal), 0)::integer
    INTO v_enriched_json, v_scorer_total_pts
    FROM (
      SELECT
        sd.side,
        sd.player_name,
        sd.goals,
        GREATEST(10, ROUND(
          150.0 * (
            1.0 - 1.0 / COALESCE(
              po.odd_anytime,
              CASE COALESCE(li.position, 'M')
                WHEN 'A' THEN 3.5
                WHEN 'D' THEN 15.0
                WHEN 'G' THEN 25.0
                ELSE 7.0
              END
            )
          )
        )::integer) AS pts_per_goal
      FROM (
        SELECT 'home' AS side, elem->>'name' AS player_name,
               COALESCE((elem->>'goals')::int, 1) AS goals
        FROM jsonb_array_elements(COALESCE(p_scorers_json->'home', '[]'::jsonb)) AS elem
        WHERE (elem->>'name') IS NOT NULL AND trim(elem->>'name') <> ''
        UNION ALL
        SELECT 'away' AS side, elem->>'name' AS player_name,
               COALESCE((elem->>'goals')::int, 1) AS goals
        FROM jsonb_array_elements(COALESCE(p_scorers_json->'away', '[]'::jsonb)) AS elem
        WHERE (elem->>'name') IS NOT NULL AND trim(elem->>'name') <> ''
      ) sd
      LEFT JOIN LATERAL (
        SELECT odd_anytime FROM public.player_odds po2
        WHERE po2.match_id = p_match_id AND po2.player_name = sd.player_name
        LIMIT 1
      ) po ON true
      LEFT JOIN LATERAL (
        SELECT position FROM public.lineups li2
        WHERE li2.match_id = p_match_id AND li2.player_name = sd.player_name
        LIMIT 1
      ) li ON true
    ) scored;

    INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount, applied_booster_id)
    VALUES (
      p_match_id, v_user_id, 'scorer_allocation',
      COALESCE(v_enriched_json, p_scorers_json)::TEXT,
      GREATEST(10, COALESCE(v_scorer_total_pts, 10)),
      p_booster_id
    )
    ON CONFLICT (match_id, user_id) WHERE prono_type = 'scorer_allocation'
    DO UPDATE SET
      prono_value        = EXCLUDED.prono_value,
      reward_amount      = EXCLUDED.reward_amount,
      placed_at          = NOW(),
      applied_booster_id = EXCLUDED.applied_booster_id;
  END IF;

  -- ── Abonnement automatique au match ───────────────────────────────────────
  INSERT INTO public.match_subscriptions (user_id, match_id, smart_mute)
  VALUES (v_user_id, p_match_id, false)
  ON CONFLICT (user_id, match_id) DO NOTHING;

  -- ── Consommation du booster ───────────────────────────────────────────────
  IF v_inv_id IS NOT NULL THEN
    UPDATE user_boosters_inventory
    SET consumed_at = now(), consumed_on_prono_id = v_prono_id
    WHERE id = v_inv_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'score', v_score, 'base_pts', v_base_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_match_prono(UUID, INT, INT, JSONB, UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. resolve_match_pronos v5
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_match_pronos(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status           text;
  v_home             integer;
  v_away             integer;
  v_final            text;
  v_real_1n2         text;
  r                  record;
  v_won              boolean;
  v_n_won            integer := 0;
  v_n_lost           integer := 0;

  -- Bonus rarité
  v_total_1n2_ok     integer := 0;
  v_exact_score_ok   integer := 0;
  v_rarity_pct       numeric;
  v_rarity_bonus     integer := 20;  -- défaut : "évident"

  -- Calcul pts
  v_prono_home       integer;
  v_prono_away       integer;
  v_prono_1n2        text;
  v_pts              integer;
  v_rarity_earned    integer;
  v_base_pts         integer;

  -- Scorer allocation
  v_scorers_json     jsonb;
  v_scorer_entry     jsonb;
  v_scorer_name      text;
  v_scorer_pred_goals integer;
  v_scorer_actual_goals integer;
  v_scorer_credited  integer;
  v_scorer_pts_each  integer;
  v_scorer_total_pts integer;

  -- Boosters
  v_booster_type     text;
  v_safety_refund    integer;

  c_xp_prono_won     constant integer := 45;
  c_scorer_fallback  constant integer := 30;  -- fallback si pas de pts stocké
BEGIN
  SELECT m.status, m.home_score, m.away_score
    INTO v_status, v_home, v_away
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'match_not_found'); END IF;
  IF v_status IS DISTINCT FROM 'finished' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_finished', 'status', v_status); END IF;
  IF v_home IS NULL OR v_away IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'missing_scores'); END IF;

  v_final    := v_home::text || '-' || v_away::text;
  v_real_1n2 := CASE
    WHEN v_home > v_away THEN 'H'
    WHEN v_home = v_away THEN 'D'
    ELSE 'A'
  END;

  -- ── Pré-calcul bonus rarité ───────────────────────────────────────────────
  -- Ratio : parmi ceux qui ont le bon 1N2, combien avaient l'exact score ?
  SELECT
    COUNT(*) FILTER (WHERE
      prono_type = 'exact_score'
      AND SPLIT_PART(prono_value, '-', 1) ~ '^\d+$'
      AND SPLIT_PART(prono_value, '-', 2) ~ '^\d+$'
      AND (CASE
        WHEN SPLIT_PART(prono_value, '-', 1)::int > SPLIT_PART(prono_value, '-', 2)::int THEN 'H'
        WHEN SPLIT_PART(prono_value, '-', 1)::int = SPLIT_PART(prono_value, '-', 2)::int THEN 'D'
        ELSE 'A'
      END) = v_real_1n2
    ),
    COUNT(*) FILTER (WHERE
      prono_type = 'exact_score'
      AND lower(trim(prono_value)) = lower(trim(v_final))
    )
  INTO v_total_1n2_ok, v_exact_score_ok
  FROM public.pronos
  WHERE match_id = p_match_id AND status = 'pending';

  -- Seuil minimum 5 joueurs avec le bon 1N2 pour calculer la rarité
  IF v_total_1n2_ok >= 5 THEN
    v_rarity_pct   := (v_exact_score_ok::numeric / v_total_1n2_ok::numeric) * 100;
    v_rarity_bonus := CASE
      WHEN v_rarity_pct > 30  THEN 20   -- évident
      WHEN v_rarity_pct > 20  THEN 30   -- rare
      WHEN v_rarity_pct > 5   THEN 50   -- très rare
      WHEN v_rarity_pct > 0.5 THEN 70   -- méga rare
      ELSE 100                            -- ultra rare
    END;
  END IF;

  -- ── Boucle principale ─────────────────────────────────────────────────────
  FOR r IN
    SELECT * FROM public.pronos
    WHERE match_id = p_match_id AND status = 'pending'
    ORDER BY placed_at
  LOOP
    v_won          := false;
    v_pts          := 0;
    v_rarity_earned := 0;
    v_booster_type := NULL;

    IF r.applied_booster_id IS NOT NULL THEN
      SELECT effect_type INTO v_booster_type FROM boosters_catalog WHERE id = r.applied_booster_id;
    END IF;

    -- ── exact_score ──────────────────────────────────────────────────────────
    IF r.prono_type = 'exact_score' THEN
      IF SPLIT_PART(r.prono_value, '-', 1) ~ '^\d+$'
         AND SPLIT_PART(r.prono_value, '-', 2) ~ '^\d+$' THEN
        v_prono_home := SPLIT_PART(r.prono_value, '-', 1)::integer;
        v_prono_away := SPLIT_PART(r.prono_value, '-', 2)::integer;
        v_prono_1n2  := CASE
          WHEN v_prono_home > v_prono_away THEN 'H'
          WHEN v_prono_home = v_prono_away THEN 'D'
          ELSE 'A'
        END;

        IF v_prono_1n2 = v_real_1n2 THEN
          v_won := true;
          -- Base : reward_amount stocké (= pts 1N2 calculés depuis odds à la pose)
          v_pts := COALESCE(r.reward_amount, 50);

          -- Exact score → ×2 + bonus rarité
          IF lower(trim(r.prono_value)) = lower(trim(v_final)) THEN
            v_rarity_earned := v_rarity_bonus;
            v_pts           := (v_pts * 2) + v_rarity_earned;
          END IF;
        END IF;
      END IF;

      IF v_won THEN
        v_base_pts := v_pts;
        IF v_booster_type = 'double_xp'  THEN v_pts := v_pts * 2;
        ELSIF v_booster_type = 'cote_plus' THEN v_pts := FLOOR(v_pts * 1.2)::integer;
        END IF;

        UPDATE public.pronos p
          SET status = 'won', points_earned = v_pts, contre_pied_bonus = v_rarity_earned
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance       = pr.sifflets_balance       + v_pts,
                lifetime_points_earned = pr.lifetime_points_earned + v_pts,
                xp                     = pr.xp                     + c_xp_prono_won,
                rank                   = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at             = now()
            WHERE pr.id = r.user_id;

          IF v_booster_type IN ('double_xp', 'cote_plus') AND v_pts > v_base_pts THEN
            INSERT INTO booster_highlights (user_id, booster_id, match_id, base_reward, boosted_reward)
            VALUES (r.user_id, r.applied_booster_id, p_match_id, v_base_pts, v_pts);
          END IF;

          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          IF v_booster_type = 'safety_net' THEN
            v_safety_refund := FLOOR(COALESCE(r.reward_amount, 50) * 0.5)::integer;
            UPDATE public.profiles SET sifflets_balance = sifflets_balance + v_safety_refund WHERE id = r.user_id;
          END IF;
          v_n_lost := v_n_lost + 1;
        END IF;
      END IF;

    -- ── scorer (legacy) ──────────────────────────────────────────────────────
    ELSIF r.prono_type = 'scorer' THEN
      v_won := EXISTS (
        SELECT 1 FROM public.match_timeline_events e
        WHERE e.match_id = p_match_id AND e.event_type = 'goal' AND e.player_name IS NOT NULL
          AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(r.prono_value), '\s+', ' ', 'g'))
      );

      IF v_won THEN
        v_pts      := COALESCE(r.reward_amount, c_scorer_fallback);
        v_base_pts := v_pts;
        IF v_booster_type = 'double_xp'  THEN v_pts := v_pts * 2;
        ELSIF v_booster_type = 'cote_plus' THEN v_pts := FLOOR(v_pts * 1.2)::integer;
        END IF;

        UPDATE public.pronos p SET status = 'won', points_earned = v_pts
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance       = pr.sifflets_balance       + v_pts,
                lifetime_points_earned = pr.lifetime_points_earned + v_pts,
                xp                     = pr.xp                     + c_xp_prono_won,
                rank                   = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at             = now()
            WHERE pr.id = r.user_id;
          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    -- ── scorer_allocation ────────────────────────────────────────────────────
    ELSIF r.prono_type = 'scorer_allocation' THEN
      v_scorer_total_pts := 0;

      BEGIN
        v_scorers_json := r.prono_value::jsonb;
      EXCEPTION WHEN OTHERS THEN
        v_scorers_json := NULL;
      END;

      IF v_scorers_json IS NOT NULL THEN
        -- Supporte le format objet {"home": [...], "away": [...]}
        -- Chaque entrée : {"name": "X", "goals": N, "pts": P}
        FOR v_scorer_entry IN
          SELECT elem
          FROM (
            SELECT jsonb_array_elements(COALESCE(v_scorers_json->'home', '[]'::jsonb)) AS elem
            UNION ALL
            SELECT jsonb_array_elements(COALESCE(v_scorers_json->'away', '[]'::jsonb)) AS elem
          ) sub
          WHERE elem IS NOT NULL
        LOOP
          v_scorer_name       := v_scorer_entry->>'name';
          v_scorer_pred_goals := COALESCE((v_scorer_entry->>'goals')::int, 1);
          -- pts stockés à la pose ou fallback
          v_scorer_pts_each   := COALESCE((v_scorer_entry->>'pts')::int, c_scorer_fallback);

          IF v_scorer_name IS NULL OR trim(v_scorer_name) = '' THEN CONTINUE; END IF;

          -- Compte les buts effectifs du joueur dans la timeline
          SELECT COUNT(*)::integer INTO v_scorer_actual_goals
          FROM public.match_timeline_events e
          WHERE e.match_id = p_match_id
            AND e.event_type = 'goal'
            AND e.player_name IS NOT NULL
            AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
                = lower(regexp_replace(trim(v_scorer_name), '\s+', ' ', 'g'));

          -- Crédite jusqu'au nombre de buts prédits (LEAST)
          v_scorer_credited  := LEAST(v_scorer_pred_goals, v_scorer_actual_goals);
          v_scorer_total_pts := v_scorer_total_pts + (v_scorer_credited * v_scorer_pts_each);
        END LOOP;
      END IF;

      IF v_scorer_total_pts > 0 THEN
        v_pts      := v_scorer_total_pts;
        v_base_pts := v_pts;
        IF v_booster_type = 'double_xp'  THEN v_pts := v_pts * 2;
        ELSIF v_booster_type = 'cote_plus' THEN v_pts := FLOOR(v_pts * 1.2)::integer;
        END IF;

        UPDATE public.pronos p SET status = 'won', points_earned = v_pts
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance       = pr.sifflets_balance       + v_pts,
                lifetime_points_earned = pr.lifetime_points_earned + v_pts,
                xp                     = pr.xp                     + c_xp_prono_won,
                rank                   = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at             = now()
            WHERE pr.id = r.user_id;

          IF v_booster_type IN ('double_xp', 'cote_plus') AND v_pts > v_base_pts THEN
            INSERT INTO booster_highlights (user_id, booster_id, match_id, base_reward, boosted_reward)
            VALUES (r.user_id, r.applied_booster_id, p_match_id, v_base_pts, v_pts);
          END IF;

          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p SET status = 'lost', points_earned = 0
          WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          IF v_booster_type = 'safety_net' THEN
            v_safety_refund := FLOOR(COALESCE(r.reward_amount, 10) * 0.5)::integer;
            UPDATE public.profiles SET sifflets_balance = sifflets_balance + v_safety_refund WHERE id = r.user_id;
          END IF;
          v_n_lost := v_n_lost + 1;
        END IF;
      END IF;

    ELSE
      CONTINUE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',              true,
    'match_id',        p_match_id,
    'final_score',     v_final,
    'won',             v_n_won,
    'lost',            v_n_lost,
    'rarity_bonus',    v_rarity_bonus,
    'total_1n2_ok',    v_total_1n2_ok,
    'exact_score_ok',  v_exact_score_ok
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_match_pronos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_match_pronos(uuid) TO service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. resolve_event_parimutuel v3 — speed bonus VAR
-- Le reward parimutuel est multiplié selon la rapidité du pari :
--   0–15s  → ×1.25  (parieur flash)
--   16–45s → ×1.00  (normal)
--   46–90s → ×0.90  (tardif)
-- Le braquage squad (Phase 2) n'est PAS affecté par le speed factor.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_event_parimutuel(
  p_event_id UUID,
  p_result   TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_market_created_at TIMESTAMPTZ;
  v_total_pool        BIGINT;
  v_winning_pool      BIGINT;
  v_multiplier        NUMERIC;
  v_bet               RECORD;
  v_reward            INTEGER;
  v_base_reward       INTEGER;
  v_elapsed_seconds   NUMERIC;
  v_speed_factor      NUMERIC;
  v_squad_id          UUID;
  v_chambrage_pool    BIGINT;
  v_league_win_pool   BIGINT;
  v_bonus             INTEGER;
  v_winners           INTEGER := 0;
  v_total_paid        BIGINT  := 0;
  v_braquage_squads   INTEGER := 0;
  v_booster_type      TEXT;
  c_xp_live_won       CONSTANT integer := 30;
  c_xp_braquage_bonus CONSTANT integer := 8;
BEGIN
  -- Récupère created_at pour le speed bonus
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status IN ('open', 'closed')
    RETURNING created_at INTO v_market_created_at;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_open'; END IF;

  SELECT
    COALESCE(SUM(amount_staked), 0),
    COALESCE(SUM(CASE WHEN chosen_option = p_result THEN amount_staked ELSE 0 END), 0)
  INTO v_total_pool, v_winning_pool
  FROM public.bets
  WHERE event_id = p_event_id AND status = 'pending';

  IF v_winning_pool = 0 THEN
    -- Tout le monde a perdu : safety_net + lost
    FOR v_bet IN
      SELECT b.id, b.user_id, b.amount_staked, b.applied_booster_id
      FROM public.bets b
      WHERE b.event_id = p_event_id AND b.status = 'pending'
    LOOP
      UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
      IF v_bet.applied_booster_id IS NOT NULL THEN
        SELECT effect_type INTO v_booster_type FROM boosters_catalog WHERE id = v_bet.applied_booster_id;
        IF v_booster_type = 'safety_net' THEN
          v_bonus := FLOOR(v_bet.amount_staked * 0.5)::INTEGER;
          UPDATE public.profiles SET sifflets_balance = sifflets_balance + v_bonus WHERE id = v_bet.user_id;
        END IF;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('winners', 0, 'total_paid', 0, 'multiplier', 0, 'braquage_squads', 0);
  END IF;

  v_multiplier := v_total_pool::NUMERIC / v_winning_pool::NUMERIC;

  -- ── Phase 1 : Distribution parimutuel + speed bonus ──────────────────────
  FOR v_bet IN
    SELECT * FROM public.bets
    WHERE event_id = p_event_id AND status = 'pending'
    FOR UPDATE
  LOOP
    v_booster_type := NULL;
    IF v_bet.applied_booster_id IS NOT NULL THEN
      SELECT effect_type INTO v_booster_type FROM boosters_catalog WHERE id = v_bet.applied_booster_id;
    END IF;

    IF v_bet.chosen_option = p_result THEN
      v_reward := FLOOR(v_bet.amount_staked * v_multiplier)::INTEGER;

      -- Speed bonus : calculé sur created_at du bet vs created_at du marché
      IF v_market_created_at IS NOT NULL THEN
        v_elapsed_seconds := EXTRACT(EPOCH FROM (v_bet.created_at - v_market_created_at));
        v_speed_factor := CASE
          WHEN v_elapsed_seconds <= 15 THEN 1.25   -- flash ⚡
          WHEN v_elapsed_seconds <= 45 THEN 1.00   -- normal
          ELSE 0.90                                  -- tardif
        END;
        v_reward := FLOOR(v_reward * v_speed_factor)::INTEGER;
      END IF;

      v_base_reward := v_reward;

      -- Boosters
      IF v_booster_type = 'double_xp' THEN
        v_reward := v_reward * 2;
      ELSIF v_booster_type = 'cote_plus' THEN
        v_reward := FLOOR(v_reward * 1.2)::INTEGER;
      END IF;

      UPDATE public.bets SET status = 'won', potential_reward = v_reward WHERE id = v_bet.id;

      UPDATE public.profiles
        SET sifflets_balance       = sifflets_balance       + v_reward,
            lifetime_points_earned = lifetime_points_earned + v_reward,
            xp                     = xp                     + c_xp_live_won,
            rank                   = public.profile_rank_from_xp(xp + c_xp_live_won),
            updated_at             = NOW()
        WHERE id = v_bet.user_id;

      IF v_booster_type IN ('double_xp', 'cote_plus') AND v_reward > v_base_reward THEN
        INSERT INTO booster_highlights (user_id, booster_id, match_id, base_reward, boosted_reward)
        SELECT v_bet.user_id, v_bet.applied_booster_id, me.match_id, v_base_reward, v_reward
        FROM market_events me WHERE me.id = p_event_id;
      END IF;

      v_winners    := v_winners + 1;
      v_total_paid := v_total_paid + v_reward;
    ELSE
      UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
      IF v_booster_type = 'safety_net' THEN
        v_bonus := FLOOR(v_bet.amount_staked * 0.5)::INTEGER;
        UPDATE public.profiles SET sifflets_balance = sifflets_balance + v_bonus WHERE id = v_bet.user_id;
      END IF;
    END IF;
  END LOOP;

  -- ── Phase 2 : Bonus Braquage intra-squad (15% des mises perdantes) ────────
  FOR v_squad_id IN
    SELECT DISTINCT squad_id
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount_staked), 0) INTO v_chambrage_pool
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'lost';
    IF v_chambrage_pool = 0 THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(amount_staked), 0) INTO v_league_win_pool
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'won';
    IF v_league_win_pool = 0 THEN CONTINUE; END IF;

    FOR v_bet IN
      SELECT * FROM public.bets
      WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'won'
      FOR UPDATE
    LOOP
      v_bonus := FLOOR(
        v_chambrage_pool::NUMERIC
        * (v_bet.amount_staked::NUMERIC / v_league_win_pool::NUMERIC)
        * 0.15
      )::INTEGER;

      IF v_bonus > 0 THEN
        UPDATE public.bets SET potential_reward = potential_reward + v_bonus WHERE id = v_bet.id;
        UPDATE public.profiles
          SET sifflets_balance       = sifflets_balance       + v_bonus,
              lifetime_points_earned = lifetime_points_earned + v_bonus,
              xp                     = xp                     + c_xp_braquage_bonus,
              rank                   = public.profile_rank_from_xp(xp + c_xp_braquage_bonus),
              updated_at             = NOW()
          WHERE id = v_bet.user_id;
        v_total_paid := v_total_paid + v_bonus;
      END IF;
    END LOOP;

    v_braquage_squads := v_braquage_squads + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'winners',         v_winners,
    'total_paid',      v_total_paid,
    'multiplier',      ROUND(v_multiplier, 2),
    'braquage_squads', v_braquage_squads
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_event_parimutuel(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_event_parimutuel(UUID, TEXT) TO service_role;
