-- Sprint INSP-1 : Streak Freeze (style Duolingo)
-- Achetable avec des Sifflets (500 pts), max 3 en stock, auto-consommé si streak rompu.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_freezes_owned      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes_used_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_streak_freezes_max;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_streak_freezes_max CHECK (streak_freezes_owned >= 0 AND streak_freezes_owned <= 3);

-- RPC d'achat : coût 500 pts, vérif max 3, débit atomique
CREATE OR REPLACE FUNCTION public.purchase_streak_freeze()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID    := auth.uid();
  v_balance  NUMERIC;
  v_owned    INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT sifflets_balance, streak_freezes_owned
  INTO   v_balance, v_owned
  FROM   profiles
  WHERE  id = v_user_id
  FOR UPDATE;

  IF v_balance < 500 THEN
    RAISE EXCEPTION 'Solde insuffisant (500 pts requis)';
  END IF;

  IF v_owned >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 Streak Freezes en stock';
  END IF;

  UPDATE profiles
  SET    sifflets_balance       = sifflets_balance - 500,
         streak_freezes_owned   = streak_freezes_owned + 1
  WHERE  id = v_user_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'remaining_balance', (v_balance - 500)::INT,
    'freezes_owned',    (v_owned + 1)::INT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_streak_freeze() TO authenticated;
