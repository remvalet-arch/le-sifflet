-- Migration 0017 : Paris long terme (onglet POLYMARKET)

CREATE TABLE IF NOT EXISTS public.long_term_bets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_type         text NOT NULL CHECK (bet_type IN ('scorer', 'exact_score')),
  bet_value        text NOT NULL,
  amount_staked    integer NOT NULL CHECK (amount_staked >= 10),
  potential_reward integer NOT NULL,
  placed_at        timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  UNIQUE (match_id, user_id, bet_type, bet_value)
);

ALTER TABLE public.long_term_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ltb_select_own" ON public.long_term_bets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ltb_service_write" ON public.long_term_bets
  FOR ALL TO service_role USING (true);

-- RPC atomique : débit solde + insertion du pari
CREATE OR REPLACE FUNCTION public.place_long_term_bet(
  p_match_id         uuid,
  p_bet_type         text,
  p_bet_value        text,
  p_amount_staked    integer,
  p_potential_reward integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_balance integer;
  v_bet_id  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT sifflets_balance INTO v_balance
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_balance < p_amount_staked THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  UPDATE public.profiles
    SET sifflets_balance = sifflets_balance - p_amount_staked
    WHERE id = v_user_id;

  INSERT INTO public.long_term_bets
    (match_id, user_id, bet_type, bet_value, amount_staked, potential_reward)
  VALUES
    (p_match_id, v_user_id, p_bet_type, p_bet_value, p_amount_staked, p_potential_reward)
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;
