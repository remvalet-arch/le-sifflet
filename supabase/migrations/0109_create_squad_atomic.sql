-- Atomic squad creation: INSERT squad + owner member + welcome message in one transaction.
-- Avoids partial state if the server crashes between the three sequential INSERTs.
CREATE OR REPLACE FUNCTION create_squad_atomic(
  p_name       TEXT,
  p_is_private BOOLEAN,
  p_owner_id   UUID
)
RETURNS SETOF squads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
  v_squad       squads;
BEGIN
  -- Generate a 6-char invite code only for private squads
  IF p_is_private THEN
    SELECT string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1),
      ''
    )
    INTO v_invite_code
    FROM generate_series(1, 6);
  END IF;

  INSERT INTO squads (name, is_private, invite_code, owner_id)
  VALUES (p_name, p_is_private, v_invite_code, p_owner_id)
  RETURNING * INTO v_squad;

  INSERT INTO squad_members (squad_id, user_id)
  VALUES (v_squad.id, p_owner_id);

  INSERT INTO squad_messages (squad_id, user_id, content, is_system_message)
  VALUES (
    v_squad.id,
    NULL,
    '🎉 Bienvenue dans **' || p_name || '** ! Présentez-vous, chambrez-vous, et que le Boss de la VAR remporte le mois ! 🏆',
    TRUE
  );

  RETURN NEXT v_squad;
END;
$$;

-- RLS: only authenticated users can call this function (auth.uid() checked in the caller route)
REVOKE ALL ON FUNCTION create_squad_atomic(TEXT, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_squad_atomic(TEXT, BOOLEAN, UUID) TO authenticated;
