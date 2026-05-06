-- 0071 : Mise à jour resolve_squad_round — inclut les gains VAR (bets) en plus des pronos

CREATE OR REPLACE FUNCTION public.resolve_squad_round(
  p_season_id    uuid,
  p_round_number integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture        record;
  v_home_pts       integer;
  v_away_pts       integer;
  v_home_var       integer;
  v_away_var       integer;
  v_winner_id      uuid;
  v_resolved_count integer := 0;
  v_total_rounds   integer;
BEGIN
  FOR v_fixture IN
    SELECT * FROM public.squad_fixtures
    WHERE season_id    = p_season_id
      AND round_number = p_round_number
      AND status       = 'active'
  LOOP
    -- Points pronos Home
    SELECT COALESCE(SUM(pr.points_earned), 0)
    INTO v_home_pts
    FROM public.pronos pr
    JOIN public.matches m ON m.id = pr.match_id
    WHERE pr.user_id = v_fixture.home_member_id
      AND pr.status  = 'won'
      AND m.start_time >= v_fixture.week_start::timestamptz
      AND m.start_time <  (v_fixture.week_start + INTERVAL '7 days')::timestamptz;

    -- Gains VAR Home (paris live gagnants sur la semaine)
    SELECT COALESCE(SUM(GREATEST(b.potential_reward - b.amount_staked, 0)), 0)
    INTO v_home_var
    FROM public.bets b
    WHERE b.user_id   = v_fixture.home_member_id
      AND b.status    = 'won'
      AND b.placed_at >= v_fixture.week_start::timestamptz
      AND b.placed_at <  (v_fixture.week_start + INTERVAL '7 days')::timestamptz;

    -- Points pronos Away
    SELECT COALESCE(SUM(pr.points_earned), 0)
    INTO v_away_pts
    FROM public.pronos pr
    JOIN public.matches m ON m.id = pr.match_id
    WHERE pr.user_id = v_fixture.away_member_id
      AND pr.status  = 'won'
      AND m.start_time >= v_fixture.week_start::timestamptz
      AND m.start_time <  (v_fixture.week_start + INTERVAL '7 days')::timestamptz;

    -- Gains VAR Away
    SELECT COALESCE(SUM(GREATEST(b.potential_reward - b.amount_staked, 0)), 0)
    INTO v_away_var
    FROM public.bets b
    WHERE b.user_id   = v_fixture.away_member_id
      AND b.status    = 'won'
      AND b.placed_at >= v_fixture.week_start::timestamptz
      AND b.placed_at <  (v_fixture.week_start + INTERVAL '7 days')::timestamptz;

    -- Score total = pronos + VAR
    v_home_pts := v_home_pts + v_home_var;
    v_away_pts := v_away_pts + v_away_var;

    IF    v_home_pts > v_away_pts THEN v_winner_id := v_fixture.home_member_id;
    ELSIF v_away_pts > v_home_pts THEN v_winner_id := v_fixture.away_member_id;
    ELSE                               v_winner_id := NULL;
    END IF;

    UPDATE public.squad_fixtures
    SET home_points = v_home_pts,
        away_points = v_away_pts,
        winner_id   = v_winner_id,
        status      = 'finished'
    WHERE id = v_fixture.id;

    UPDATE public.squad_standings
    SET played     = played + 1,
        won        = won   + CASE WHEN v_winner_id = v_fixture.home_member_id THEN 1 ELSE 0 END,
        drawn      = drawn + CASE WHEN v_winner_id IS NULL                    THEN 1 ELSE 0 END,
        lost       = lost  + CASE WHEN v_winner_id = v_fixture.away_member_id THEN 1 ELSE 0 END,
        points     = points + CASE
                       WHEN v_winner_id = v_fixture.home_member_id THEN 3
                       WHEN v_winner_id IS NULL                    THEN 1
                       ELSE 0 END,
        pronos_pts = pronos_pts + v_home_pts
    WHERE season_id = p_season_id AND user_id = v_fixture.home_member_id;

    UPDATE public.squad_standings
    SET played     = played + 1,
        won        = won   + CASE WHEN v_winner_id = v_fixture.away_member_id THEN 1 ELSE 0 END,
        drawn      = drawn + CASE WHEN v_winner_id IS NULL                    THEN 1 ELSE 0 END,
        lost       = lost  + CASE WHEN v_winner_id = v_fixture.home_member_id THEN 1 ELSE 0 END,
        points     = points + CASE
                       WHEN v_winner_id = v_fixture.away_member_id THEN 3
                       WHEN v_winner_id IS NULL                    THEN 1
                       ELSE 0 END,
        pronos_pts = pronos_pts + v_away_pts
    WHERE season_id = p_season_id AND user_id = v_fixture.away_member_id;

    v_resolved_count := v_resolved_count + 1;
  END LOOP;

  UPDATE public.squad_fixtures
  SET status = 'active'
  WHERE season_id    = p_season_id
    AND round_number = p_round_number + 1
    AND status       = 'upcoming';

  UPDATE public.squad_seasons
  SET current_round = p_round_number + 1
  WHERE id = p_season_id;

  SELECT total_rounds INTO v_total_rounds
  FROM public.squad_seasons WHERE id = p_season_id;

  IF p_round_number >= v_total_rounds THEN
    UPDATE public.squad_seasons
    SET status   = 'finished',
        ended_at = now()
    WHERE id = p_season_id;
  END IF;

  RETURN jsonb_build_object(
    'resolved_fixtures', v_resolved_count,
    'round_number',      p_round_number,
    'season_finished',   p_round_number >= v_total_rounds
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_squad_round(uuid, integer) TO service_role;
