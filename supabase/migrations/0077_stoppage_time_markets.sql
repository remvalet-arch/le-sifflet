-- 0077 : Paris arrêts de jeu (stoppage_ht / stoppage_ft) + multi-options
--
-- 1. Nouveaux types d'événements
-- 2. place_bet — accepte toute option non-vide (multi-choix)
-- 3. get_event_odds — dynamique (plus d'options 'oui'/'non' codées en dur)

-- ── 1. Nouveaux types ─────────────────────────────────────────────────────────
ALTER TABLE public.market_events
  DROP CONSTRAINT IF EXISTS market_events_type_check;

ALTER TABLE public.market_events
  ADD CONSTRAINT market_events_type_check
  CHECK (type IN (
    'penalty_check',
    'penalty_outcome',
    'var_goal',
    'red_card',
    'injury_sub',
    'free_kick',
    'corner',
    'stoppage_ht',
    'stoppage_ft'
  ));

-- ── 2. place_bet — multi-options ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      UUID,
  p_chosen_option TEXT,
  p_amount_staked INTEGER,
  p_multiplier    NUMERIC DEFAULT 1.5,
  p_squad_id      UUID    DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_bet_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF length(trim(coalesce(p_chosen_option, ''))) = 0 THEN RAISE EXCEPTION 'Option invalide'; END IF;
  IF p_amount_staked < 10 THEN RAISE EXCEPTION 'Mise minimum : 10 Pts'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_events WHERE id = p_event_id AND status = 'open'
  ) THEN RAISE EXCEPTION 'event_not_open'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bets WHERE event_id = p_event_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'Pari déjà enregistré pour cet événement'; END IF;

  IF p_squad_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_id = p_squad_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'not_squad_member';
    END IF;
  END IF;

  SELECT sifflets_balance INTO v_balance
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount_staked THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  UPDATE public.profiles
    SET sifflets_balance = sifflets_balance - p_amount_staked
    WHERE id = v_user_id;

  INSERT INTO public.bets (user_id, event_id, chosen_option, amount_staked, potential_reward, squad_id)
  VALUES (
    v_user_id,
    p_event_id,
    p_chosen_option,
    p_amount_staked,
    FLOOR(p_amount_staked * GREATEST(p_multiplier, 1.0))::INTEGER,
    p_squad_id
  )
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bet(uuid, text, integer, numeric, uuid) TO authenticated;

-- ── 3. get_event_odds — dynamique ────────────────────────────────────────────
--    Retourne les cotes réelles des options ayant des mises.
--    Si aucune mise, retourne vide (UI gère les défauts par option).
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
  tot AS (SELECT COALESCE(SUM(staked), 0) AS grand_total FROM base)
  SELECT
    b.chosen_option   AS option,
    b.staked          AS pool_staked,
    t.grand_total     AS total_pool,
    CASE
      WHEN t.grand_total = 0 THEN 2.00
      WHEN b.staked       = 0 THEN 2.00
      ELSE GREATEST(1.00, ROUND(t.grand_total::NUMERIC / b.staked::NUMERIC, 2))
    END               AS implied_multiplier
  FROM base b, tot t;
$$;
