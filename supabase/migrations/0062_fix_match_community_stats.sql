-- 0062_fix_match_community_stats.sql
-- Fix Le Bug Mathématique des 100% (Stats Pronos)

CREATE OR REPLACE VIEW v_match_pronos_stats AS
WITH score_counts AS (
  SELECT
    match_id,
    count(*) as total_pronos,
    count(*) FILTER (WHERE split_part(prono_value, '-', 1) ~ '^[0-9]+$' AND split_part(prono_value, '-', 2) ~ '^[0-9]+$' AND split_part(prono_value, '-', 1)::int > split_part(prono_value, '-', 2)::int) as votes_1,
    count(*) FILTER (WHERE split_part(prono_value, '-', 1) ~ '^[0-9]+$' AND split_part(prono_value, '-', 2) ~ '^[0-9]+$' AND split_part(prono_value, '-', 1)::int = split_part(prono_value, '-', 2)::int) as votes_N,
    count(*) FILTER (WHERE split_part(prono_value, '-', 1) ~ '^[0-9]+$' AND split_part(prono_value, '-', 2) ~ '^[0-9]+$' AND split_part(prono_value, '-', 1)::int < split_part(prono_value, '-', 2)::int) as votes_2
  FROM pronos
  WHERE prono_type = 'exact_score'
  GROUP BY match_id
),
team_forms AS (
  SELECT DISTINCT ON (team_id)
    team_id,
    form
  FROM league_standings
  ORDER BY team_id, updated_at DESC
)
SELECT
  m.id as match_id,
  COALESCE(sc.total_pronos, 0) as total_pronos,
  CASE WHEN (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0)) > 0 THEN 
    round((sc.votes_1::numeric / (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0))) * 100)
  ELSE 0 END as community_1_pct,
  
  CASE WHEN (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0)) > 0 THEN 
    round((sc.votes_N::numeric / (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0))) * 100)
  ELSE 0 END as community_N_pct,
  
  CASE WHEN (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0)) > 0 THEN 
    100 
      - round((sc.votes_1::numeric / (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0))) * 100) 
      - round((sc.votes_N::numeric / (COALESCE(sc.votes_1, 0) + COALESCE(sc.votes_N, 0) + COALESCE(sc.votes_2, 0))) * 100)
  ELSE 0 END as community_2_pct,
  
  th.form as home_form,
  ta.form as away_form
FROM matches m
LEFT JOIN score_counts sc ON m.id = sc.match_id
LEFT JOIN teams t_home ON m.home_team_id = t_home.id
LEFT JOIN team_forms th ON t_home.api_football_id = th.team_id
LEFT JOIN teams t_away ON m.away_team_id = t_away.id
LEFT JOIN team_forms ta ON t_away.api_football_id = ta.team_id;

GRANT SELECT ON v_match_pronos_stats TO public;
GRANT SELECT ON v_match_pronos_stats TO anon;
GRANT SELECT ON v_match_pronos_stats TO authenticated;
