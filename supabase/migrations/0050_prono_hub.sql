-- 0050 : Hub de Pronostics — scorer_allocation + partial unique indexes + place_match_prono RPC

-- 1. Étendre le type de prono avec scorer_allocation
ALTER TABLE public.pronos
  DROP CONSTRAINT IF EXISTS pronos_prono_type_check;

ALTER TABLE public.pronos
  ADD CONSTRAINT pronos_prono_type_check
  CHECK (prono_type IN ('exact_score', 'scorer', 'scorer_allocation'));

-- 2. Index partiels pour upsert "un prono par user par match" (Hub centralisé)
CREATE UNIQUE INDEX IF NOT EXISTS pronos_exact_score_unique
  ON public.pronos(match_id, user_id) WHERE prono_type = 'exact_score';

CREATE UNIQUE INDEX IF NOT EXISTS pronos_scorer_alloc_unique
  ON public.pronos(match_id, user_id) WHERE prono_type = 'scorer_allocation';

-- 3. RPC place_match_prono : upsert exact_score + scorer_allocation + auto-subscribe
CREATE OR REPLACE FUNCTION public.place_match_prono(
  p_match_id     UUID,
  p_home_score   INT,
  p_away_score   INT,
  p_scorers_json JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_score   TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = p_match_id AND status = 'upcoming'
  ) THEN
    RAISE EXCEPTION 'Ce match n''est plus disponible pour les pronostics';
  END IF;

  v_score := p_home_score::TEXT || '-' || p_away_score::TEXT;

  INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount)
  VALUES (p_match_id, v_user_id, 'exact_score', v_score, 2000)
  ON CONFLICT (match_id, user_id) WHERE prono_type = 'exact_score'
  DO UPDATE SET prono_value = EXCLUDED.prono_value, placed_at = NOW();

  IF p_scorers_json IS NOT NULL THEN
    INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount)
    VALUES (p_match_id, v_user_id, 'scorer_allocation', p_scorers_json::TEXT, 500)
    ON CONFLICT (match_id, user_id) WHERE prono_type = 'scorer_allocation'
    DO UPDATE SET prono_value = EXCLUDED.prono_value, placed_at = NOW();
  END IF;

  INSERT INTO public.match_subscriptions (user_id, match_id, smart_mute)
  VALUES (v_user_id, p_match_id, false)
  ON CONFLICT (user_id, match_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'score', v_score);
END;
$$;
