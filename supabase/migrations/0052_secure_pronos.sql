-- Migration 0052 : Sécurisation de place_prono (statut upcoming)

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

  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = p_match_id AND status = 'upcoming'
  ) THEN
    RAISE EXCEPTION 'Ce match n''est plus disponible pour les pronostics';
  END IF;

  INSERT INTO public.pronos (match_id, user_id, prono_type, prono_value, reward_amount)
  VALUES (p_match_id, v_user_id, p_prono_type, p_prono_value, p_reward_amount)
  RETURNING id INTO v_id;

  INSERT INTO public.match_subscriptions (user_id, match_id, smart_mute)
  VALUES (v_user_id, p_match_id, false)
  ON CONFLICT (user_id, match_id) DO NOTHING;

  RETURN v_id;
END;
$$;
