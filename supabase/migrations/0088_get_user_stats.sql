-- Sprint MPP-3 : Stats par club / saison
-- RPC appelée par le client authentifié : utilise auth.uid() en interne.
-- Filtres optionnels : competition_id, team_id (club préféré), season_id.

CREATE OR REPLACE FUNCTION public.get_my_stats(
  p_competition_id UUID DEFAULT NULL,
  p_team_id        UUID DEFAULT NULL,
  p_season_id      UUID DEFAULT NULL
)
RETURNS TABLE (
  pronos_total   BIGINT,
  pronos_correct BIGINT,
  pronos_exact   BIGINT,
  var_bets_total BIGINT,
  var_bets_won   BIGINT,
  points_total   NUMERIC,
  best_win       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_season_start TIMESTAMPTZ;
  v_season_end   TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_season_id IS NOT NULL THEN
    SELECT starts_at, ends_at INTO v_season_start, v_season_end
    FROM seasons WHERE id = p_season_id;
  END IF;

  RETURN QUERY
  WITH prono_agg AS (
    SELECT
      COUNT(*)::BIGINT                                                                      AS total,
      COUNT(*) FILTER (WHERE p.status = 'won')::BIGINT                                     AS correct,
      COUNT(*) FILTER (WHERE p.status = 'won' AND p.prono_type = 'exact_score')::BIGINT    AS exact_sc,
      COALESCE(SUM(p.points_earned) FILTER (WHERE p.status = 'won'), 0)::NUMERIC           AS pts
    FROM pronos p
    JOIN matches m ON m.id = p.match_id
    WHERE p.user_id = v_user_id
      AND p.status IN ('won', 'lost')
      AND (p_competition_id IS NULL OR m.competition_id = p_competition_id)
      AND (p_team_id       IS NULL OR m.home_team_id = p_team_id OR m.away_team_id = p_team_id)
      AND (p_season_id     IS NULL OR (m.start_time >= v_season_start AND m.start_time <= v_season_end))
  ),
  bet_agg AS (
    SELECT
      COUNT(*)::BIGINT                                                                       AS total,
      COUNT(*) FILTER (WHERE b.status = 'won')::BIGINT                                      AS won,
      COALESCE(SUM(b.potential_reward)  FILTER (WHERE b.status = 'won'), 0)::NUMERIC        AS pts,
      COALESCE(MAX(b.potential_reward)  FILTER (WHERE b.status = 'won'), 0)::NUMERIC        AS best
    FROM bets b
    JOIN market_events me ON me.id = b.event_id
    JOIN matches m        ON m.id  = me.match_id
    WHERE b.user_id = v_user_id
      AND b.status IN ('won', 'lost')
      AND (p_competition_id IS NULL OR m.competition_id  = p_competition_id)
      AND (p_team_id        IS NULL OR m.home_team_id = p_team_id OR m.away_team_id = p_team_id)
      AND (p_season_id      IS NULL OR (m.start_time >= v_season_start AND m.start_time <= v_season_end))
  )
  SELECT
    pa.total,
    pa.correct,
    pa.exact_sc,
    ba.total,
    ba.won,
    (pa.pts + ba.pts)::NUMERIC,
    ba.best::NUMERIC
  FROM prono_agg pa, bet_agg ba;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stats(UUID, UUID, UUID) TO authenticated;
