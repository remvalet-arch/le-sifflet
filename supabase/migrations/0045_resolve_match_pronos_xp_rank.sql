-- 0045 : résolution pronos post-match + XP / grade alignés sur l'XP
-- =============================================================================
-- XP_PRONO_WON = 45 | XP_LIVE_BET_WON = 30 (pari VAR court terme gagné, hors bonus braquage)
-- Grades (rank) dérivés uniquement de profiles.xp via profile_rank_from_xp().

CREATE OR REPLACE FUNCTION public.profile_rank_from_xp(p_xp integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_xp < 500 THEN 'Arbitre de District'
    WHEN p_xp < 2000 THEN 'Sifflet de Bronze'
    WHEN p_xp < 5000 THEN 'Sifflet d''Argent'
    ELSE 'Boss de la VAR'
  END;
$$;

COMMENT ON FUNCTION public.profile_rank_from_xp(integer) IS
  'Grade lobby (TopBar / profil) : seuils XP 0–499 / 500–1999 / 2000–4999 / 5000+.';

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve_match_pronos : crédite reward + XP + rank ; idempotent sur status pending
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_match_pronos(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status        text;
  v_home          integer;
  v_away          integer;
  v_final         text;
  r               record;
  v_won           boolean;
  v_n_won         integer := 0;
  v_n_lost        integer := 0;
  c_xp_prono_won  constant integer := 45;
BEGIN
  SELECT m.status, m.home_score, m.away_score
    INTO v_status, v_home, v_away
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'match_not_found');
  END IF;

  IF v_status IS DISTINCT FROM 'finished' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_finished', 'status', v_status);
  END IF;

  IF v_home IS NULL OR v_away IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_scores');
  END IF;

  v_final := v_home::text || '-' || v_away::text;

  FOR r IN
    SELECT * FROM public.pronos
    WHERE match_id = p_match_id AND status = 'pending'
    ORDER BY placed_at
  LOOP
    v_won := false;

    IF r.prono_type = 'exact_score' THEN
      v_won := lower(trim(r.prono_value)) = lower(trim(v_final));
    ELSIF r.prono_type = 'scorer' THEN
      v_won := EXISTS (
        SELECT 1
        FROM public.match_timeline_events e
        WHERE e.match_id = p_match_id
          AND e.event_type = 'goal'
          AND e.player_name IS NOT NULL
          AND lower(regexp_replace(trim(e.player_name), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(r.prono_value), '\s+', ' ', 'g'))
      );
    ELSE
      CONTINUE;
    END IF;

    IF v_won THEN
      UPDATE public.pronos p
      SET status = 'won'
      WHERE p.id = r.id AND p.status = 'pending';

      IF FOUND THEN
        UPDATE public.profiles pr
        SET
          sifflets_balance = pr.sifflets_balance + r.reward_amount,
          xp               = pr.xp + c_xp_prono_won,
          rank             = public.profile_rank_from_xp(pr.xp + c_xp_prono_won),
          updated_at       = now()
        WHERE pr.id = r.user_id;
        v_n_won := v_n_won + 1;
      END IF;
    ELSE
      UPDATE public.pronos p
      SET status = 'lost'
      WHERE p.id = r.id AND p.status = 'pending';
      IF FOUND THEN
        v_n_lost := v_n_lost + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'match_id', p_match_id,
    'final_score', v_final,
    'won', v_n_won,
    'lost', v_n_lost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_match_pronos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_match_pronos(uuid) TO service_role;

COMMENT ON FUNCTION public.resolve_match_pronos(uuid) IS
  'À appeler quand le match est finished : résout pronos pending, crédite Sifflets + XP + rank ; idempotent.';

-- Backfill grade depuis XP actuelle
UPDATE public.profiles
SET rank = public.profile_rank_from_xp(xp)
WHERE true;

-- ─────────────────────────────────────────────────────────────────────────────
-- resolve_event_parimutuel : XP fixe live + rank (remplace GREATEST(5, reward/10))
-- Bonus braquage : petit XP + rank
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_event_parimutuel(
  p_event_id UUID,
  p_result   TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_pool      BIGINT;
  v_winning_pool    BIGINT;
  v_multiplier      NUMERIC;
  v_bet             RECORD;
  v_reward          INTEGER;
  v_squad_id        UUID;
  v_chambrage_pool  BIGINT;
  v_league_win_pool BIGINT;
  v_bonus           INTEGER;
  v_winners         INTEGER := 0;
  v_total_paid      BIGINT  := 0;
  v_braquage_squads INTEGER := 0;
  c_xp_live_won     CONSTANT integer := 30;
  c_xp_braquage_bonus CONSTANT integer := 8;
BEGIN
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  SELECT
    COALESCE(SUM(amount_staked), 0),
    COALESCE(SUM(CASE WHEN chosen_option = p_result THEN amount_staked ELSE 0 END), 0)
  INTO v_total_pool, v_winning_pool
  FROM public.bets
  WHERE event_id = p_event_id AND status = 'pending';

  IF v_winning_pool = 0 THEN
    UPDATE public.bets SET status = 'lost' WHERE event_id = p_event_id AND status = 'pending';
    RETURN jsonb_build_object('winners', 0, 'total_paid', 0, 'multiplier', 0, 'braquage_squads', 0);
  END IF;

  v_multiplier := v_total_pool::NUMERIC / v_winning_pool::NUMERIC;

  FOR v_bet IN
    SELECT * FROM public.bets
    WHERE event_id = p_event_id AND status = 'pending'
    FOR UPDATE
  LOOP
    IF v_bet.chosen_option = p_result THEN
      v_reward := FLOOR(v_bet.amount_staked * v_multiplier)::INTEGER;

      UPDATE public.bets
        SET status = 'won', potential_reward = v_reward
        WHERE id = v_bet.id;

      UPDATE public.profiles
        SET sifflets_balance = sifflets_balance + v_reward,
            xp               = xp + c_xp_live_won,
            rank             = public.profile_rank_from_xp(xp + c_xp_live_won),
            updated_at       = NOW()
        WHERE id = v_bet.user_id;

      v_winners    := v_winners + 1;
      v_total_paid := v_total_paid + v_reward;
    ELSE
      UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
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
        * v_bet.amount_staked::NUMERIC
        / v_league_win_pool::NUMERIC
      )::INTEGER;

      IF v_bonus > 0 THEN
        UPDATE public.profiles
          SET sifflets_balance = sifflets_balance + v_bonus,
              xp               = xp + c_xp_braquage_bonus,
              rank             = public.profile_rank_from_xp(xp + c_xp_braquage_bonus),
              updated_at       = NOW()
          WHERE id = v_bet.user_id;

        UPDATE public.bets
          SET potential_reward = potential_reward + v_bonus
          WHERE id = v_bet.id;
      END IF;
    END LOOP;

    v_braquage_squads := v_braquage_squads + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'winners',         v_winners,
    'total_paid',      v_total_paid,
    'multiplier',      ROUND(v_multiplier, 4),
    'braquage_squads', v_braquage_squads
  );
END;
$$;
