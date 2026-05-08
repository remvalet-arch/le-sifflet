-- 0097_fix_place_bet_option_check.sql
-- Corrige place_bet : supprime la contrainte codée en dur NOT IN ('oui','non')
-- qui bloquait les marchés de stoppage (options "1","2","3","4","5","6+").
-- Remplacé par un simple check non-vide.

CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      UUID,
  p_chosen_option TEXT,
  p_amount_staked INTEGER,
  p_multiplier    NUMERIC  DEFAULT 1.5,
  p_squad_id      UUID     DEFAULT NULL,
  p_booster_id    UUID     DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_balance      INTEGER;
  v_min_bet      INTEGER;
  v_potential    INTEGER;
  v_bet_id       UUID;
  v_inv_id       UUID;
  v_booster_type TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  IF p_chosen_option IS NULL OR trim(p_chosen_option) = '' THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  IF p_multiplier < 1.01 OR p_multiplier > 15.0 THEN RAISE EXCEPTION 'invalid_multiplier'; END IF;

  -- Event open check
  PERFORM id FROM market_events
  WHERE id = p_event_id AND status = 'open'
    AND created_at > now() - interval '90 seconds'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_open'; END IF;

  -- Lock profile and read balance
  SELECT sifflets_balance INTO v_balance
  FROM profiles WHERE id = v_user_id FOR UPDATE;

  -- Dynamic min-bet check
  v_min_bet := public.get_min_bet_for_balance(v_balance);
  IF p_amount_staked < v_min_bet THEN
    RAISE EXCEPTION 'min_bet_not_reached:%', v_min_bet;
  END IF;

  IF v_balance < p_amount_staked THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  -- Squad membership check
  IF p_squad_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_id = p_squad_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'not_squad_member';
    END IF;
  END IF;

  -- Validate and consume booster
  IF p_booster_id IS NOT NULL THEN
    SELECT bc.effect_type INTO v_booster_type
    FROM boosters_catalog bc WHERE bc.id = p_booster_id AND bc.is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'booster_not_found'; END IF;

    SELECT id INTO v_inv_id
    FROM user_boosters_inventory
    WHERE user_id = v_user_id AND booster_id = p_booster_id AND consumed_at IS NULL
    LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'booster_not_owned'; END IF;
  END IF;

  -- Debit
  UPDATE profiles SET sifflets_balance = sifflets_balance - p_amount_staked WHERE id = v_user_id;

  v_potential := FLOOR(p_amount_staked * p_multiplier)::INTEGER;
  IF v_booster_type = 'cote_plus' THEN
    v_potential := FLOOR(v_potential * 1.2)::INTEGER;
  END IF;

  INSERT INTO bets (user_id, event_id, chosen_option, amount_staked, potential_reward, squad_id, applied_booster_id)
  VALUES (v_user_id, p_event_id, p_chosen_option, p_amount_staked, v_potential, p_squad_id, p_booster_id)
  RETURNING id INTO v_bet_id;

  IF v_inv_id IS NOT NULL THEN
    UPDATE user_boosters_inventory
    SET consumed_at = now(), consumed_on_event_id = p_event_id
    WHERE id = v_inv_id;
  END IF;

  RETURN v_bet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bet(UUID, TEXT, INTEGER, NUMERIC, UUID, UUID) TO authenticated;
