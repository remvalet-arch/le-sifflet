-- Migration 0007 : nouveaux types d'alertes (5 actions "Kop de supporters")
-- ⚠️  Supprime les anciens events/signaux avec les types legacy (penalty/offside/card).
--    Les paris associés sont cascade-supprimés via la FK bets.event_id.

-- 1. Suppression des données legacy (les types changent → données incompatibles)
DELETE FROM public.market_events
  WHERE type IN ('penalty', 'offside', 'card');

DELETE FROM public.alert_signals
  WHERE action_type IN ('penalty', 'offside', 'card');

-- 2. Remplacement des CHECK constraints (noms auto-générés par PostgreSQL)
ALTER TABLE public.market_events
  DROP CONSTRAINT IF EXISTS market_events_type_check;

ALTER TABLE public.market_events
  ADD CONSTRAINT market_events_type_check
  CHECK (type IN ('penalty_check', 'penalty_outcome', 'var_goal', 'red_card', 'injury_sub'));

ALTER TABLE public.alert_signals
  DROP CONSTRAINT IF EXISTS alert_signals_action_type_check;

ALTER TABLE public.alert_signals
  ADD CONSTRAINT alert_signals_action_type_check
  CHECK (action_type IN ('penalty_check', 'penalty_outcome', 'var_goal', 'red_card', 'injury_sub'));
