-- Le Sifflet — fonction atomique de placement de pari
-- SECURITY DEFINER : tourne avec les droits du owner (postgres) → bypass RLS/grants sur profiles

CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      uuid,
  p_chosen_option text,
  p_amount_staked integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_event          public.market_events%ROWTYPE;
  v_elapsed        integer;
  v_multiplier     numeric(4, 2);
  v_potential      numeric(14, 4);
  v_balance        integer;
  v_bet_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_amount_staked < 10 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Verrouillle l'event pour éviter les races conditions
  SELECT * INTO v_event FROM public.market_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF v_event.status <> 'open' THEN RAISE EXCEPTION 'event_not_open'; END IF;

  v_elapsed := EXTRACT(EPOCH FROM (now() - v_event.created_at))::integer;
  IF v_elapsed > 90 THEN RAISE EXCEPTION 'event_expired'; END IF;

  -- Dégressivité des gains
  v_multiplier := CASE
    WHEN v_elapsed <= 10 THEN 2.0
    WHEN v_elapsed <= 45 THEN 1.5
    ELSE                      1.1
  END;

  v_potential := p_amount_staked * v_multiplier;

  -- Verrouille le solde pour éviter le découvert concurrent
  SELECT sifflets_balance INTO v_balance
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF v_balance < p_amount_staked THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  -- Transaction atomique : débit + pari
  UPDATE public.profiles
    SET sifflets_balance = sifflets_balance - p_amount_staked
    WHERE id = v_user_id;

  INSERT INTO public.bets (user_id, event_id, chosen_option, amount_staked, potential_reward)
    VALUES (v_user_id, p_event_id, p_chosen_option, p_amount_staked, v_potential)
    RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bet(uuid, text, integer) TO authenticated;
