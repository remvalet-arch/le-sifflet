-- Migration 0037 : Pronostics gratuits (onglet Pronos — matchs à venir)

CREATE TABLE IF NOT EXISTS public.pronos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prono_type    TEXT        NOT NULL CHECK (prono_type IN ('exact_score', 'scorer')),
  prono_value   TEXT        NOT NULL,
  reward_amount INTEGER     NOT NULL CHECK (reward_amount > 0),
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  UNIQUE (match_id, user_id, prono_type, prono_value)
);

ALTER TABLE public.pronos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pronos_select_own" ON public.pronos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pronos_service_write" ON public.pronos
  FOR ALL TO service_role USING (true);

-- RPC sans débit de solde — le prono est gratuit
CREATE OR REPLACE FUNCTION public.place_prono(
  p_match_id      UUID,
  p_prono_type    TEXT,
  p_prono_value   TEXT,
  p_reward_amount INTEGER
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_id      UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount)
  VALUES (p_match_id, v_user_id, p_prono_type, p_prono_value, p_reward_amount)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
