-- Migration 0051 : Mise à jour du trust_score lors de la résolution d'un event

CREATE OR REPLACE FUNCTION public.resolve_event(
  p_event_id  uuid,
  p_result    text  -- 'oui' | 'non'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initiators uuid[];
BEGIN
  IF p_result NOT IN ('oui', 'non') THEN
    RAISE EXCEPTION 'invalid_result';
  END IF;

  -- Récupère les initiateurs et marque l'event résolu
  UPDATE market_events
  SET status = 'resolved', result = p_result, resolved_at = now()
  WHERE id = p_event_id AND status = 'open'
  RETURNING initiators INTO v_initiators;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- Clôture les paris
  UPDATE bets SET status = 'won'
  WHERE event_id = p_event_id AND chosen_option = p_result;

  UPDATE bets SET status = 'lost'
  WHERE event_id = p_event_id AND chosen_option <> p_result;

  -- Crédite les gagnants
  UPDATE profiles p
  SET sifflets_balance = p.sifflets_balance + b.potential_reward::integer
  FROM bets b
  WHERE b.event_id = p_event_id
    AND b.status   = 'won'
    AND b.user_id  = p.id;

  -- Mise à jour du trust_score (Anti-Trolls)
  -- +2 points de confiance pour les initiateurs si l'alerte s'est avérée vraie (OUI)
  -- -5 points de confiance si c'était une "fake news" (NON a gagné)
  IF v_initiators IS NOT NULL AND array_length(v_initiators, 1) > 0 THEN
    IF p_result = 'oui' THEN
      UPDATE profiles
      SET trust_score = LEAST(100, trust_score + 2)
      WHERE id = ANY(v_initiators);
    ELSE
      UPDATE profiles
      SET trust_score = GREATEST(0, trust_score - 5)
      WHERE id = ANY(v_initiators);
    END IF;
  END IF;

END;
$$;
