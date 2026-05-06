-- Lifetime points earned column — tracks total points ever won (not balance)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lifetime_points_earned INTEGER NOT NULL DEFAULT 0;

-- Backfill: pronos won
UPDATE profiles p
SET lifetime_points_earned = coalesce(subq.earned, 0)
FROM (
  SELECT user_id,
         SUM(GREATEST(points_earned, reward_amount)) AS earned
  FROM pronos
  WHERE status = 'won'
  GROUP BY user_id
) subq
WHERE p.id = subq.user_id;

-- Backfill: bets net gain (what player actually won above stake)
UPDATE profiles p
SET lifetime_points_earned = lifetime_points_earned + coalesce(subq.net, 0)
FROM (
  SELECT user_id,
         SUM(potential_reward - amount_staked) AS net
  FROM bets
  WHERE status = 'won' AND potential_reward > amount_staked
  GROUP BY user_id
) subq
WHERE p.id = subq.user_id;

-- Trigger: increment on prono resolved won
CREATE OR REPLACE FUNCTION trg_fn_lifetime_pronos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS DISTINCT FROM 'won') THEN
    UPDATE profiles
    SET lifetime_points_earned = lifetime_points_earned + GREATEST(NEW.points_earned, NEW.reward_amount)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pronos_lifetime_points ON pronos;
CREATE TRIGGER trg_pronos_lifetime_points
  AFTER UPDATE ON pronos
  FOR EACH ROW EXECUTE FUNCTION trg_fn_lifetime_pronos();

-- Trigger: increment on bet resolved won
CREATE OR REPLACE FUNCTION trg_fn_lifetime_bets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS DISTINCT FROM 'won')
     AND NEW.potential_reward > NEW.amount_staked THEN
    UPDATE profiles
    SET lifetime_points_earned = lifetime_points_earned + (NEW.potential_reward - NEW.amount_staked)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bets_lifetime_points ON bets;
CREATE TRIGGER trg_bets_lifetime_points
  AFTER UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION trg_fn_lifetime_bets();
