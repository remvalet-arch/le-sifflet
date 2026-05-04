-- 0055 : Fix définitif — s'assure que match_subscriptions existe
-- et recrée place_match_prono (idempotent).

-- Étape 1 : table match_subscriptions si absente
CREATE TABLE IF NOT EXISTS public.match_subscriptions (
  user_id    UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  match_id   UUID        NOT NULL REFERENCES public.matches  (id) ON DELETE CASCADE,
  smart_mute BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS match_subscriptions_match_idx
  ON public.match_subscriptions (match_id);

ALTER TABLE public.match_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'match_subscriptions' AND policyname = 'match_subscriptions_own'
  ) THEN
    CREATE POLICY "match_subscriptions_own"
      ON public.match_subscriptions
      FOR ALL TO authenticated
      USING  (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_subscriptions TO authenticated;
GRANT ALL ON public.match_subscriptions TO service_role;

-- Étape 2 : recréer la RPC (CREATE OR REPLACE est idempotent)
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

GRANT EXECUTE ON FUNCTION public.place_match_prono TO authenticated;
