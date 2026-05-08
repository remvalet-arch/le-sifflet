-- ─────────────────────────────────────────────────────────────────────────────
-- 0095_fix_lifetime_points.sql
-- Correctif : resolve_event_parimutuel et resolve_match_pronos n'incrémentaient
-- pas lifetime_points_earned, ce qui empêchait le trigger trg_sync_season_points
-- de mettre à jour season_points. Les deux colonnes restent à 0 pour tous les
-- paris et pronos resolus depuis 0091.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. resolve_event_parimutuel — ajout lifetime_points_earned sur WIN + BRAQUAGE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_event_parimutuel(
  p_event_id UUID,
  p_result   TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_pool       BIGINT;
  v_winning_pool     BIGINT;
  v_multiplier       NUMERIC;
  v_bet              RECORD;
  v_reward           INTEGER;
  v_squad_id         UUID;
  v_chambrage_pool   BIGINT;
  v_league_win_pool  BIGINT;
  v_bonus            INTEGER;
  v_winners          INTEGER := 0;
  v_total_paid       BIGINT  := 0;
  v_braquage_squads  INTEGER := 0;
  v_booster_type     TEXT;
  v_base_reward      INTEGER;
  c_xp_live_won      CONSTANT integer := 30;
  c_xp_braquage_bonus CONSTANT integer := 8;
BEGIN
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status IN ('open', 'closed');
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_open'; END IF;

  SELECT
    COALESCE(SUM(amount_staked), 0),
    COALESCE(SUM(CASE WHEN chosen_option = p_result THEN amount_staked ELSE 0 END), 0)
  INTO v_total_pool, v_winning_pool
  FROM public.bets
  WHERE event_id = p_event_id AND status = 'pending';

  IF v_winning_pool = 0 THEN
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
      v_base_reward := v_reward;

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
        SELECT v_bet.user_id, v_bet.applied_booster_id,
               me.match_id, v_base_reward, v_reward
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
    'winners',        v_winners,
    'total_paid',     v_total_paid,
    'multiplier',     ROUND(v_multiplier, 2),
    'braquage_squads', v_braquage_squads
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_event_parimutuel(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_event_parimutuel(UUID, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. resolve_match_pronos — ajout lifetime_points_earned sur chaque type de win
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

  v_total_1n2_ok     integer := 0;
  v_exact_score_ok   integer := 0;
  v_cp_pct           numeric;
  v_cp_bonus         integer := 30;

  v_prono_home       integer;
  v_prono_away       integer;
  v_prono_1n2        text;
  v_pts              integer;
  v_cp_earned        integer;
  v_scorers_json     jsonb;
  v_scorer_name      text;
  v_scorer_pts       integer;
  v_scorer_match     boolean;

  v_booster_type     text;
  v_base_pts         integer;
  v_safety_refund    integer;

  c_xp_prono_won     constant integer := 45;
  c_base_1n2_pts     constant integer := 50;
  c_scorer_pts       constant integer := 30;
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

  IF v_total_1n2_ok >= 5 THEN
    v_cp_pct   := (v_exact_score_ok::numeric / v_total_1n2_ok::numeric) * 100;
    v_cp_bonus := CASE
      WHEN v_cp_pct > 40 THEN 10
      WHEN v_cp_pct > 15 THEN 30
      WHEN v_cp_pct > 5  THEN 60
      ELSE 100
    END;
  END IF;

  FOR r IN
    SELECT * FROM public.pronos
    WHERE match_id = p_match_id AND status = 'pending'
    ORDER BY placed_at
  LOOP
    v_won          := false;
    v_pts          := 0;
    v_cp_earned    := 0;
    v_booster_type := NULL;

    IF r.applied_booster_id IS NOT NULL THEN
      SELECT effect_type INTO v_booster_type FROM boosters_catalog WHERE id = r.applied_booster_id;
    END IF;

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
        v_won := (v_prono_home = v_home AND v_prono_away = v_away);
      END IF;

      IF v_won THEN
        v_pts      := c_base_1n2_pts + v_cp_bonus;
        v_cp_earned := v_cp_bonus;
        v_base_pts := v_pts;
        IF v_booster_type = 'double_xp' THEN v_pts := v_pts * 2;
        ELSIF v_booster_type = 'cote_plus' THEN v_pts := FLOOR(v_pts * 1.2)::integer;
        END IF;

        UPDATE public.pronos p
          SET status = 'won', points_earned = v_pts, contre_pied_bonus = v_cp_earned
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
        UPDATE public.pronos p SET status = 'lost', points_earned = 0 WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          IF v_booster_type = 'safety_net' THEN
            v_safety_refund := FLOOR(r.reward_amount * 0.5)::integer;
            UPDATE public.profiles SET sifflets_balance = sifflets_balance + v_safety_refund WHERE id = r.user_id;
          END IF;
          v_n_lost := v_n_lost + 1;
        END IF;
      END IF;

    ELSIF r.prono_type = 'scorer' THEN
      v_won := EXISTS (
        SELECT 1 FROM public.match_timeline_events e
        WHERE e.match_id = p_match_id AND e.event_type = 'goal' AND e.player_name IS NOT NULL
          AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(r.prono_value), '\s+', ' ', 'g'))
      );

      IF v_won THEN
        v_pts      := c_scorer_pts;
        v_base_pts := v_pts;
        IF v_booster_type = 'double_xp' THEN v_pts := v_pts * 2;
        ELSIF v_booster_type = 'cote_plus' THEN v_pts := FLOOR(v_pts * 1.2)::integer;
        END IF;

        UPDATE public.pronos p SET status = 'won', points_earned = v_pts WHERE p.id = r.id AND p.status = 'pending';
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
        UPDATE public.pronos p SET status = 'lost', points_earned = 0 WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    ELSIF r.prono_type = 'scorer_allocation' THEN
      v_scorer_pts := 0;
      BEGIN
        v_scorers_json := r.prono_value::jsonb;
        IF jsonb_typeof(v_scorers_json) <> 'array' THEN v_scorers_json := '[]'::jsonb; END IF;
      EXCEPTION WHEN OTHERS THEN
        v_scorers_json := '[]'::jsonb;
      END;

      FOR v_scorer_name IN SELECT elem FROM jsonb_array_elements_text(v_scorers_json) elem LOOP
        v_scorer_match := EXISTS (
          SELECT 1 FROM public.match_timeline_events e
          WHERE e.match_id = p_match_id AND e.event_type = 'goal' AND e.player_name IS NOT NULL
            AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
                = lower(regexp_replace(trim(v_scorer_name), '\s+', ' ', 'g'))
        );
        IF v_scorer_match THEN v_scorer_pts := v_scorer_pts + c_scorer_pts; END IF;
      END LOOP;

      IF v_scorer_pts > 0 THEN
        UPDATE public.pronos p SET status = 'won', points_earned = v_scorer_pts WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN
          UPDATE public.profiles pr
            SET sifflets_balance       = pr.sifflets_balance       + v_scorer_pts,
                lifetime_points_earned = pr.lifetime_points_earned + v_scorer_pts,
                xp                     = pr.xp                     + c_xp_prono_won,
                rank                   = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
                updated_at             = now()
            WHERE pr.id = r.user_id;
          v_n_won := v_n_won + 1;
        END IF;
      ELSE
        UPDATE public.pronos p SET status = 'lost', points_earned = 0 WHERE p.id = r.id AND p.status = 'pending';
        IF FOUND THEN v_n_lost := v_n_lost + 1; END IF;
      END IF;

    ELSE
      CONTINUE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'match_id', p_match_id, 'final_score', v_final,
    'won', v_n_won, 'lost', v_n_lost, 'contre_pied_bonus', v_cp_bonus,
    'total_1n2_ok', v_total_1n2_ok, 'exact_score_ok', v_exact_score_ok
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_match_pronos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_match_pronos(uuid) TO service_role;
