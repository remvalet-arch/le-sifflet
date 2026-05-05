-- Migration 0058 : statut intermédiaire 'closed' pour market_events
-- Transitions : open → closed (fin fenêtre 90s) → resolved (verdict arbitre/API)

-- Étend la contrainte CHECK pour inclure 'closed'
ALTER TABLE public.market_events
  DROP CONSTRAINT IF EXISTS market_events_status_check;

ALTER TABLE public.market_events
  ADD CONSTRAINT market_events_status_check
  CHECK (status IN ('open', 'closed', 'locked', 'resolved'));

-- Fonction appelée par le cron pour fermer les events dont la fenêtre de vote est expirée
CREATE OR REPLACE FUNCTION public.close_expired_market_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed_count integer;
BEGIN
  UPDATE market_events
  SET status = 'closed'
  WHERE status = 'open'
    AND created_at < now() - interval '90 seconds';
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_market_events() TO service_role;
