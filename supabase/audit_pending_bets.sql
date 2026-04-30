-- ============================================================
-- AUDIT : paris longs "pending" sur des matchs terminés
-- ============================================================
-- Si cette requête retourne des lignes, cela signifie que la RPC
-- resolve_long_term_bets n'a pas été appelée (ou a échoué silencieusement)
-- lors de la fin du match.
-- Action corrective : appeler manuellement /api/admin/finish-match
-- avec le match_id concerné, ou exécuter la RPC directement :
--   SELECT resolve_long_term_bets('<match_id>');
-- ============================================================

SELECT
    ltb.id              AS bet_id,
    ltb.user_id,
    p.username,
    ltb.match_id,
    m.team_home || ' — ' || m.team_away  AS match_label,
    m.status            AS match_status,
    m.home_score || '-' || m.away_score  AS final_score,
    ltb.bet_type,
    ltb.bet_value,
    ltb.amount_staked,
    ltb.potential_reward,
    ltb.placed_at
FROM
    long_term_bets  ltb
    JOIN matches    m  ON m.id  = ltb.match_id
    JOIN profiles   p  ON p.id  = ltb.user_id
WHERE
    ltb.status = 'pending'
    AND m.status   = 'finished'
ORDER BY
    ltb.placed_at DESC;
