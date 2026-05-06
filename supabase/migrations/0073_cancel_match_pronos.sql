-- RPC: cancel all pending pronos for a cancelled/postponed match and refund reward_amount
CREATE OR REPLACE FUNCTION public.cancel_match_pronos(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Refund reward_amount to players and set status to 'cancelled'
  WITH updated AS (
    UPDATE public.pronos
    SET status = 'cancelled'
    WHERE match_id = p_match_id
      AND status = 'pending'
    RETURNING user_id, reward_amount
  )
  UPDATE public.profiles p
  SET sifflets_balance = p.sifflets_balance + u.reward_amount
  FROM updated u
  WHERE p.id = u.user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update match status
  UPDATE public.matches
  SET status = 'cancelled'
  WHERE id = p_match_id;

  RETURN jsonb_build_object('cancelled_pronos', v_count, 'match_id', p_match_id);
END;
$$;
