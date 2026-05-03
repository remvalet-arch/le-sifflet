-- Migration 0039 : Nouveaux types d'événements (free_kick, corner)
-- Les anciens types restent valides — ajout non-destructif.

ALTER TABLE public.market_events
  DROP CONSTRAINT IF EXISTS market_events_type_check;

ALTER TABLE public.market_events
  ADD CONSTRAINT market_events_type_check
  CHECK (type IN (
    'penalty_check',
    'penalty_outcome',
    'var_goal',
    'red_card',
    'injury_sub',
    'free_kick',
    'corner'
  ));

ALTER TABLE public.alert_signals
  DROP CONSTRAINT IF EXISTS alert_signals_action_type_check;

ALTER TABLE public.alert_signals
  ADD CONSTRAINT alert_signals_action_type_check
  CHECK (action_type IN (
    'penalty_check',
    'penalty_outcome',
    'var_goal',
    'red_card',
    'injury_sub',
    'free_kick',
    'corner'
  ));
