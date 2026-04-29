-- Migration 0006 : unicité des paris + Realtime bets + résolution des events

-- Un seul pari par user par event
ALTER TABLE public.bets
  ADD CONSTRAINT bets_user_event_unique UNIQUE (user_id, event_id);

-- REPLICA IDENTITY FULL sur bets pour que les updates (won/lost)
-- soient broadcastées via Realtime malgré la RLS
ALTER TABLE public.bets REPLICA IDENTITY FULL;

-- Ajout idempotent à la publication (déjà dans 0001 mais sécurité)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Fonction de résolution d'un market_event (SECURITY DEFINER = bypass RLS)
-- Appelée uniquement par service_role (routes admin/verify-event).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_event(
  p_event_id  uuid,
  p_result    text  -- 'oui' | 'non'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_result NOT IN ('oui', 'non') THEN
    RAISE EXCEPTION 'invalid_result';
  END IF;

  -- Marque l'event résolu (bloque si déjà résolu)
  UPDATE market_events
  SET status = 'resolved', result = p_result, resolved_at = now()
  WHERE id = p_event_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- Clôture les paris
  UPDATE bets SET status = 'won'
  WHERE event_id = p_event_id AND chosen_option = p_result;

  UPDATE bets SET status = 'lost'
  WHERE event_id = p_event_id AND chosen_option <> p_result;

  -- Crédite les gagnants (potential_reward est déjà un entier stocké en numeric)
  UPDATE profiles p
  SET sifflets_balance = p.sifflets_balance + b.potential_reward::integer
  FROM bets b
  WHERE b.event_id = p_event_id
    AND b.status   = 'won'
    AND b.user_id  = p.id;
END;
$$;

-- Seul service_role peut appeler cette fonction
GRANT EXECUTE ON FUNCTION public.resolve_event TO service_role;
