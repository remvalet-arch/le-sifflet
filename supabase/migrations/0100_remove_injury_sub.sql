-- Neutraliser les lignes injury_sub existantes
UPDATE market_events SET status = 'resolved', result = 'non'
  WHERE type = 'injury_sub' AND status IN ('open', 'closed');

-- Recréer le CHECK sans injury_sub sur market_events
ALTER TABLE market_events DROP CONSTRAINT IF EXISTS market_events_type_check;
ALTER TABLE market_events ADD CONSTRAINT market_events_type_check
  CHECK (type IN ('penalty','offside','card','var_goal','penalty_check',
                  'penalty_outcome','red_card','free_kick','corner',
                  'stoppage_ht','stoppage_ft'));

-- Recréer le CHECK sans injury_sub sur alert_signals
ALTER TABLE alert_signals DROP CONSTRAINT IF EXISTS alert_signals_action_type_check;
ALTER TABLE alert_signals ADD CONSTRAINT alert_signals_action_type_check
  CHECK (action_type IN ('penalty','offside','card','var_goal','penalty_check',
                         'penalty_outcome','red_card','free_kick','corner'));
