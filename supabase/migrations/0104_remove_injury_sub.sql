-- Neutralise les lignes injury_sub existantes avant de supprimer le type.
UPDATE public.market_events
  SET status = 'resolved', result = 'non'
  WHERE type = 'injury_sub' AND status IN ('open', 'closed');

-- Recréer le CHECK sur market_events sans injury_sub.
ALTER TABLE public.market_events DROP CONSTRAINT IF EXISTS market_events_type_check;
ALTER TABLE public.market_events ADD CONSTRAINT market_events_type_check
  CHECK (type IN (
    'penalty', 'offside', 'card', 'var_goal', 'penalty_check',
    'penalty_outcome', 'red_card', 'free_kick', 'corner',
    'stoppage_ht', 'stoppage_ft'
  ));

-- Recréer le CHECK sur alert_signals sans injury_sub.
ALTER TABLE public.alert_signals DROP CONSTRAINT IF EXISTS alert_signals_action_type_check;
ALTER TABLE public.alert_signals ADD CONSTRAINT alert_signals_action_type_check
  CHECK (action_type IN (
    'penalty_check', 'penalty_outcome', 'var_goal',
    'red_card', 'free_kick', 'corner'
  ));
