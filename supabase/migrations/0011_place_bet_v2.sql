-- Migration 0011 : place_bet v2 — accepte un multiplicateur validé côté serveur
-- Supprime l'ancienne version 3-params (migration 0003) avant de créer la v2
DROP FUNCTION IF EXISTS public.place_bet(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      uuid,
  p_chosen_option text,
  p_amount_staked integer,
  p_multiplier    float8 DEFAULT 1.1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_balance   integer;
  v_potential integer;
  v_bet_id    uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_chosen_option NOT IN ('oui', 'non') THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  IF p_amount_staked < 10 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_multiplier < 1.01 OR p_multiplier > 15.0 THEN
    RAISE EXCEPTION 'invalid_multiplier';
  END IF;

  -- Vérifie que l'event est ouvert et dans la fenêtre de 90s
  PERFORM id
  FROM market_events
  WHERE id = p_event_id
    AND status = 'open'
    AND created_at > now() - interval '90 seconds'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- Bloque la ligne profil et vérifie le solde
  SELECT sifflets_balance INTO v_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance < p_amount_staked THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Déduit immédiatement (gel des fonds)
  UPDATE profiles
  SET sifflets_balance = sifflets_balance - p_amount_staked
  WHERE id = v_user_id;

  v_potential := FLOOR(p_amount_staked * p_multiplier)::integer;

  -- INSERT (contrainte UNIQUE user_id+event_id empêche le double pari)
  INSERT INTO bets (user_id, event_id, chosen_option, amount_staked, potential_reward)
  VALUES (v_user_id, p_event_id, p_chosen_option, p_amount_staked, v_potential)
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bet TO authenticated;
