-- Add monthly_points_earned to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_points_earned integer NOT NULL DEFAULT 0;

-- Function to reset monthly_points_earned (called via cron on the 1st of each month)
CREATE OR REPLACE FUNCTION public.reset_monthly_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET monthly_points_earned = 0;
END;
$$;

-- Trigger to increment monthly_points_earned when a prono/bet is won
-- (mirrors the existing lifetime_points_earned trigger logic)
CREATE OR REPLACE FUNCTION public.increment_monthly_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pts integer;
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status <> 'won') THEN
    -- Determine points from pronos or bets
    IF TG_TABLE_NAME = 'pronos' THEN
      v_pts := COALESCE(NEW.points_earned, 0);
    ELSE
      v_pts := GREATEST(COALESCE(NEW.potential_reward, 0) - COALESCE(NEW.amount_staked, 0), 0);
    END IF;

    IF v_pts > 0 THEN
      UPDATE public.profiles
      SET monthly_points_earned = monthly_points_earned + v_pts
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_pronos ON public.pronos;
CREATE TRIGGER trg_monthly_pronos
  AFTER UPDATE ON public.pronos
  FOR EACH ROW EXECUTE FUNCTION public.increment_monthly_points();

DROP TRIGGER IF EXISTS trg_monthly_bets ON public.bets;
CREATE TRIGGER trg_monthly_bets
  AFTER UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.increment_monthly_points();
