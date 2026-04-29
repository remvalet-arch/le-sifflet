-- Migration 0008 : Trust score (Karma) + Initiateurs Waze

-- 1. trust_score sur les profils
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100
    CHECK (trust_score >= 0);

-- 2. Initiateurs du market_event (UUIDs des joueurs qui ont atteint le seuil)
ALTER TABLE public.market_events
  ADD COLUMN IF NOT EXISTS initiators uuid[] NOT NULL DEFAULT '{}';

-- 3. Mise à jour de resolve_event : payout des paris + karma des initiateurs
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

  -- Récupère les initiateurs + pose un verrou row-level pour éviter les doublons
  SELECT initiators INTO v_initiators
  FROM market_events
  WHERE id = p_event_id AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- Résout l'event
  UPDATE market_events
  SET status = 'resolved', result = p_result, resolved_at = now()
  WHERE id = p_event_id;

  -- Clôture les paris
  UPDATE bets SET status = 'won'
  WHERE event_id = p_event_id AND chosen_option = p_result;

  UPDATE bets SET status = 'lost'
  WHERE event_id = p_event_id AND chosen_option <> p_result;

  -- Crédite les gagnants des paris
  UPDATE profiles p
  SET sifflets_balance = p.sifflets_balance + b.potential_reward::integer
  FROM bets b
  WHERE b.event_id = p_event_id
    AND b.status   = 'won'
    AND b.user_id  = p.id;

  -- Karma des initiateurs selon le résultat
  IF p_result = 'oui' AND cardinality(v_initiators) > 0 THEN
    -- Événement confirmé : récompense les lanceurs d'alerte
    UPDATE profiles
    SET
      trust_score      = LEAST(trust_score + 10, 1000),
      sifflets_balance = sifflets_balance + 50
    WHERE id = ANY(v_initiators);
  ELSIF p_result = 'non' AND cardinality(v_initiators) > 0 THEN
    -- Fausse alerte : pénalise les lanceurs d'alerte
    UPDATE profiles
    SET trust_score = GREATEST(trust_score - 20, 0)
    WHERE id = ANY(v_initiators);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_event TO service_role;
