-- ============================================================
-- AUDIT : données « pending » sur matchs terminés
-- ============================================================

-- ── Pronos gratuits (flux produit actuel) ────────────────────────────────────
-- Si des lignes apparaissent : `resolve_match_pronos` n’a pas tourné en fin de match.
-- Action : sync fin de match / `POST /api/admin/finish-match` avec le match_id.

SELECT
    pr.id,
    pr.user_id,
    p.username,
    pr.match_id,
    m.team_home || ' — ' || m.team_away AS match_label,
    m.status AS match_status,
    pr.prono_type,
    pr.prono_value,
    pr.reward_amount,
    pr.placed_at
FROM
    pronos pr
    JOIN matches m ON m.id = pr.match_id
    JOIN profiles p ON p.id = pr.user_id
WHERE
    pr.status = 'pending'
    AND m.status = 'finished'
ORDER BY
    pr.placed_at DESC;

-- ── Legacy : long_term_bets (table encore en base si migration 0017 appliquée) ─
-- Même logique : `resolve_long_term_bets` est appelée depuis finish-match / sync FT.

SELECT
    ltb.id AS bet_id,
    ltb.user_id,
    p.username,
    ltb.match_id,
    m.team_home || ' — ' || m.team_away AS match_label,
    m.status AS match_status,
    ltb.bet_type,
    ltb.bet_value,
    ltb.amount_staked,
    ltb.potential_reward,
    ltb.placed_at
FROM
    long_term_bets ltb
    JOIN matches m ON m.id = ltb.match_id
    JOIN profiles p ON p.id = ltb.user_id
WHERE
    ltb.status = 'pending'
    AND m.status = 'finished'
ORDER BY
    ltb.placed_at DESC;
