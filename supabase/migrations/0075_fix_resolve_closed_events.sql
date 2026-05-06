-- 0075 : Fix resolve_event_parimutuel — accepter les events 'closed' en plus de 'open'
--
-- Bug : 0058 a introduit le statut 'closed' (fin de fenêtre 90s), mais
-- resolve_event_parimutuel filtre uniquement sur status = 'open'.
-- Résultat : tout event résolu après 90s levait event_not_open,
-- les bets restaient 'pending', les points et classements jamais mis à jour.

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
  -- Accept both 'open' and 'closed' (post-90s window) events
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status IN ('open', 'closed');
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

  -- ── Phase 1 : Distribution parimutuel (pool global) ─────────────────────────
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

  -- ── Phase 2 : Bonus Braquage (par squad) ────────────────────────────────────
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

GRANT EXECUTE ON FUNCTION public.resolve_event_parimutuel(uuid, text) TO service_role;
