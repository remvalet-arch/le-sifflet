-- Migration 0038 : Parimutuel (Room Mère) + Braquage (Room Fille)
-- ============================================================
-- Architecture à deux niveaux :
--   • Room Mère  : cotes dynamiques, calculées sur la masse totale des mises
--   • Room Fille : les Sifflets perdus par les membres d'une ligue sont
--                  redistribués uniquement aux gagnants de cette même ligue

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colonne room_id sur les paris
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS room_id UUID DEFAULT NULL
  REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bets_room_id
  ON public.bets (room_id) WHERE room_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. place_bet — v2, room_id optionnel (rétro-compatible)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      UUID,
  p_chosen_option TEXT,
  p_amount_staked INTEGER,
  p_multiplier    NUMERIC DEFAULT 1.5,
  p_room_id       UUID    DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_bet_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_chosen_option NOT IN ('oui', 'non') THEN RAISE EXCEPTION 'Option invalide'; END IF;
  IF p_amount_staked < 10 THEN RAISE EXCEPTION 'Mise minimum : 10 Pts'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_events WHERE id = p_event_id AND status = 'open'
  ) THEN RAISE EXCEPTION 'event_not_open'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bets WHERE event_id = p_event_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'Pari déjà enregistré pour cet événement'; END IF;

  SELECT sifflets_balance INTO v_balance
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount_staked THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  UPDATE public.profiles
    SET sifflets_balance = sifflets_balance - p_amount_staked
    WHERE id = v_user_id;

  INSERT INTO public.bets (user_id, event_id, chosen_option, amount_staked, potential_reward, room_id)
  VALUES (
    v_user_id,
    p_event_id,
    p_chosen_option,
    p_amount_staked,
    FLOOR(p_amount_staked * GREATEST(p_multiplier, 1.0))::INTEGER,
    p_room_id
  )
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_event_odds — cotes parimutuel temps réel
--    Appelable par n'importe quel utilisateur authentifié (READ ONLY)
-- ─────────────────────────────────────────────────────────────────────────────
-- Formule :
--   implied_multiplier(option) = total_pool / pool(option)
--   Minimum garanti : ×1.00 (on ne peut pas gagner moins que sa mise)
--   Valeur par défaut si option vide : ×2.00 (pool partagé à 50/50)
CREATE OR REPLACE FUNCTION public.get_event_odds(p_event_id UUID)
RETURNS TABLE (
  option             TEXT,
  pool_staked        BIGINT,
  total_pool         BIGINT,
  implied_multiplier NUMERIC(6,2)
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH base AS (
    SELECT chosen_option, COALESCE(SUM(amount_staked), 0) AS staked
    FROM public.bets
    WHERE event_id = p_event_id AND status = 'pending'
    GROUP BY chosen_option
  ),
  sides AS (
    SELECT 'oui'::TEXT AS chosen_option
    UNION ALL
    SELECT 'non'::TEXT
  ),
  merged AS (
    SELECT s.chosen_option, COALESCE(b.staked, 0) AS staked
    FROM sides s LEFT JOIN base b USING (chosen_option)
  ),
  tot AS (SELECT COALESCE(SUM(staked), 0) AS grand_total FROM merged)
  SELECT
    m.chosen_option   AS option,
    m.staked          AS pool_staked,
    t.grand_total     AS total_pool,
    CASE
      WHEN t.grand_total = 0 THEN 2.00   -- aucun pari encore placé
      WHEN m.staked       = 0 THEN 2.00   -- personne n'a misé sur ce côté
      ELSE GREATEST(1.00, ROUND(t.grand_total::NUMERIC / m.staked::NUMERIC, 2))
    END               AS implied_multiplier
  FROM merged m, tot t;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. resolve_event_parimutuel — résolution transactionnelle complète
--    Phase 1 : distribution parimutuel globale (Room Mère)
--    Phase 2 : bonus chambrage par ligue (Room Fille)
-- ─────────────────────────────────────────────────────────────────────────────
-- Formule Phase 1 :
--   multiplier_global = total_pool / winning_pool
--   payout(bet)       = FLOOR(bet.amount_staked × multiplier_global)
--
-- Formule Phase 2 :
--   chambrage_pool   = Σ amount_staked des perdants dans la ligue
--   bonus(bet)       = FLOOR(chambrage_pool × bet.amount_staked / league_winning_pool)
--
-- Le bonus chambrage s'ajoute au payout parimutuel. Un gagnant dans
-- une ligue reçoit donc : payout_parimutuel + bonus_braquage
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
  v_room_id         UUID;
  v_chambrage_pool  BIGINT;
  v_league_win_pool BIGINT;
  v_bonus           INTEGER;
  v_winners         INTEGER := 0;
  v_total_paid      BIGINT  := 0;
  v_braquage_rooms  INTEGER := 0;
BEGIN
  -- Verrouille l'event (idempotent via status check)
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- ── PHASE 1 : Calcul des pools ───────────────────────────────────────────
  SELECT
    COALESCE(SUM(amount_staked), 0),
    COALESCE(SUM(CASE WHEN chosen_option = p_result THEN amount_staked ELSE 0 END), 0)
  INTO v_total_pool, v_winning_pool
  FROM public.bets
  WHERE event_id = p_event_id AND status = 'pending';

  -- Aucun gagnant : tout le monde perd, aucun paiement
  IF v_winning_pool = 0 THEN
    UPDATE public.bets SET status = 'lost' WHERE event_id = p_event_id AND status = 'pending';
    RETURN jsonb_build_object('winners', 0, 'total_paid', 0, 'multiplier', 0, 'braquage_rooms', 0);
  END IF;

  v_multiplier := v_total_pool::NUMERIC / v_winning_pool::NUMERIC;

  -- ── PHASE 2 : Distribution parimutuel (Room Mère) ────────────────────────
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
            xp               = xp + GREATEST(5, v_reward / 10),
            updated_at       = NOW()
        WHERE id = v_bet.user_id;

      v_winners    := v_winners + 1;
      v_total_paid := v_total_paid + v_reward;
    ELSE
      UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
    END IF;
  END LOOP;

  -- ── PHASE 3 : Bonus Braquage (Room Fille) ────────────────────────────────
  FOR v_room_id IN
    SELECT DISTINCT room_id
    FROM public.bets
    WHERE event_id = p_event_id AND room_id IS NOT NULL
  LOOP
    -- Sifflets perdus dans la ligue → pool chambrage
    SELECT COALESCE(SUM(amount_staked), 0) INTO v_chambrage_pool
    FROM public.bets
    WHERE event_id = p_event_id AND room_id = v_room_id AND status = 'lost';

    IF v_chambrage_pool = 0 THEN CONTINUE; END IF;

    -- Mises des gagnants dans la ligue
    SELECT COALESCE(SUM(amount_staked), 0) INTO v_league_win_pool
    FROM public.bets
    WHERE event_id = p_event_id AND room_id = v_room_id AND status = 'won';

    IF v_league_win_pool = 0 THEN CONTINUE; END IF;

    -- Redistribution proportionnelle du chambrage
    FOR v_bet IN
      SELECT * FROM public.bets
      WHERE event_id = p_event_id AND room_id = v_room_id AND status = 'won'
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
              updated_at       = NOW()
          WHERE id = v_bet.user_id;

        -- Accumule dans potential_reward pour affichage total du gain
        UPDATE public.bets
          SET potential_reward = potential_reward + v_bonus
          WHERE id = v_bet.id;
      END IF;
    END LOOP;

    v_braquage_rooms := v_braquage_rooms + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'winners',        v_winners,
    'total_paid',     v_total_paid,
    'multiplier',     ROUND(v_multiplier, 4),
    'braquage_rooms', v_braquage_rooms
  );
END;
$$;
