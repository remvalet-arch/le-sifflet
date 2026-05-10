-- activate_vision_booster: consume one vision booster and return aggregated friend vote counts
-- Called server-side only; uses auth.uid() to identify the caller.

CREATE OR REPLACE FUNCTION public.activate_vision_booster(
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id              uuid := auth.uid();
  v_booster_inventory_id uuid;
  v_event_status         text;
  v_match_id             uuid;
  v_friend_choices       jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- 1. Lock an unconsumed vision booster row
  SELECT ubi.id INTO v_booster_inventory_id
  FROM user_boosters_inventory ubi
  JOIN boosters_catalog bc ON bc.id = ubi.booster_id
  WHERE ubi.user_id = v_user_id
    AND bc.effect_type = 'vision'
    AND ubi.consumed_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF v_booster_inventory_id IS NULL THEN
    RAISE EXCEPTION 'no_booster_available';
  END IF;

  -- 2. Verify event is still open
  SELECT status, match_id INTO v_event_status, v_match_id
  FROM market_events
  WHERE id = p_event_id;

  IF v_event_status IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF v_event_status != 'open' THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- 3. Mark booster consumed
  UPDATE user_boosters_inventory
  SET consumed_at          = now(),
      consumed_on_event_id = p_event_id
  WHERE id = v_booster_inventory_id;

  -- 4. Aggregate friend votes (counts only — no identity revealed)
  WITH user_friends AS (
    SELECT receiver_id AS friend_id
    FROM friend_requests
    WHERE sender_id = v_user_id AND status = 'accepted'
    UNION
    SELECT sender_id AS friend_id
    FROM friend_requests
    WHERE receiver_id = v_user_id AND status = 'accepted'
  ),
  friend_bets AS (
    SELECT b.chosen_option, count(*)::int AS cnt
    FROM bets b
    JOIN user_friends uf ON uf.friend_id = b.user_id
    WHERE b.event_id = p_event_id
    GROUP BY b.chosen_option
  )
  SELECT jsonb_object_agg(chosen_option, cnt)
  INTO v_friend_choices
  FROM friend_bets;

  v_friend_choices := COALESCE(v_friend_choices, '{}'::jsonb);

  RETURN jsonb_build_object(
    'event_id',            p_event_id,
    'match_id',            v_match_id,
    'friend_choices',      v_friend_choices,
    'booster_consumed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_vision_booster(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_vision_booster(uuid) TO authenticated;
