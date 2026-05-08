-- RPC: get_friend_pronos(p_match_id, p_user_id)
-- Returns the pronos placed by the calling user's accepted friends for a given match,
-- grouped by prono_type + prono_value so we can show "2 amis ont mis PSG gagnant".

CREATE OR REPLACE FUNCTION public.get_friend_pronos(
  p_match_id UUID,
  p_user_id  UUID
)
RETURNS TABLE (
  prono_type  TEXT,
  prono_value TEXT,
  friend_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.prono_type::TEXT,
    p.prono_value,
    COUNT(*)::BIGINT AS friend_count
  FROM pronos p
  WHERE p.match_id = p_match_id
    AND p.user_id  != p_user_id
    AND EXISTS (
      SELECT 1
      FROM friend_requests fr
      WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id   = p_user_id AND fr.receiver_id = p.user_id)
          OR
          (fr.receiver_id = p_user_id AND fr.sender_id   = p.user_id)
        )
    )
  GROUP BY p.prono_type, p.prono_value
  ORDER BY friend_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_pronos(UUID, UUID) TO authenticated;
