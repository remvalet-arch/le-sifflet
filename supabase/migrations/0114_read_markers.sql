-- ─────────────────────────────────────────────────────────────────────────────
-- 0114_read_markers.sql
-- Deux RPCs SECURITY DEFINER qui utilisent NOW() côté serveur
-- pour éviter le drift horloge client → badge non-lu qui revient.
--
-- 1. mark_squad_read(p_squad_id) — met à jour squad_members.last_read_at
-- 2. mark_dm_thread_read(p_thread_id) — met à jour user_a_read_at ou user_b_read_at
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. mark_squad_read ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_squad_read(p_squad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.squad_members
  SET last_read_at = NOW()
  WHERE squad_id = p_squad_id
    AND user_id   = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_squad_read(uuid) TO authenticated;

-- ── 2. mark_dm_thread_read ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_dm_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_user_a_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT user_a_id INTO v_user_a_id
  FROM public.direct_message_threads
  WHERE id = p_thread_id
    AND (user_a_id = v_user_id OR user_b_id = v_user_id);

  IF NOT FOUND THEN RETURN; END IF;

  IF v_user_a_id = v_user_id THEN
    UPDATE public.direct_message_threads
    SET user_a_read_at = NOW()
    WHERE id = p_thread_id;
  ELSE
    UPDATE public.direct_message_threads
    SET user_b_read_at = NOW()
    WHERE id = p_thread_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_dm_thread_read(uuid) TO authenticated;
