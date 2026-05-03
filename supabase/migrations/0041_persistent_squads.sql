-- Migration 0041 : Squads persistantes (ligues privées) — plus de lien match_id
-- =============================================================================
-- Remplace rooms / room_members par squads / squad_members.
-- bets.room_id → bets.squad_id ; place_bet(p_squad_id) ; braquage par squad sur l'événement.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tables squads + squad_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_private boolean NOT NULL DEFAULT true,
  invite_code text,
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT squads_invite_private_ck CHECK (
    (is_private = false AND invite_code IS NULL)
    OR (is_private = true AND invite_code IS NOT NULL)
  )
);

CREATE UNIQUE INDEX squads_invite_code_unique ON public.squads (invite_code)
  WHERE invite_code IS NOT NULL;

CREATE INDEX squads_owner_id_idx ON public.squads (owner_id);

CREATE TABLE public.squad_members (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES public.squads (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, squad_id)
);

CREATE INDEX squad_members_squad_id_idx ON public.squad_members (squad_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Données : rooms → squads, room_members → squad_members
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.squads (id, name, is_private, invite_code, owner_id, created_at)
SELECT id, name, is_private, invite_code, admin_id, created_at
FROM public.rooms;

INSERT INTO public.squad_members (user_id, squad_id, joined_at)
SELECT user_id, room_id, joined_at
FROM public.room_members;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Paris : squad_id (remplace room_id)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL;

UPDATE public.bets SET squad_id = room_id WHERE room_id IS NOT NULL;

ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_room_id_fkey;

DROP INDEX IF EXISTS idx_bets_room_id;

ALTER TABLE public.bets DROP COLUMN IF EXISTS room_id;

CREATE INDEX IF NOT EXISTS idx_bets_squad_id
  ON public.bets (squad_id) WHERE squad_id IS NOT NULL;

-- Anciennes tables — supprimer les policies RLS d’abord (rooms_select_visible
-- référence room_members : sans ça, DROP room_members échoue avec 2BP01).
DROP POLICY IF EXISTS "rooms_select_visible" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_as_admin" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_own_admin" ON public.rooms;
DROP POLICY IF EXISTS "room_members_select_visible" ON public.room_members;
DROP POLICY IF EXISTS "room_members_insert_self" ON public.room_members;
DROP POLICY IF EXISTS "room_members_delete_self" ON public.room_members;

DROP TABLE IF EXISTS public.room_members;
DROP TABLE IF EXISTS public.rooms;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS squads / squad_members (équivalent rooms)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squads_select_visible"
  ON public.squads FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squads.id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "squads_insert_as_owner"
  ON public.squads FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "squads_update_own_owner"
  ON public.squads FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "squad_members_select_visible"
  ON public.squad_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_members.squad_id
        AND (
          s.is_private = false
          OR s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.squad_members sm2
            WHERE sm2.squad_id = s.id AND sm2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "squad_members_insert_self"
  ON public.squad_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "squad_members_delete_self"
  ON public.squad_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.squads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.squad_members TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. place_bet — p_squad_id optionnel + vérif membre
-- ─────────────────────────────────────────────────────────────────────────────
-- Impossible de renommer p_room_id → p_squad_id avec CREATE OR REPLACE (42P13).
DROP FUNCTION IF EXISTS public.place_bet(uuid, text, integer, numeric, uuid);

CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id      UUID,
  p_chosen_option TEXT,
  p_amount_staked INTEGER,
  p_multiplier    NUMERIC DEFAULT 1.5,
  p_squad_id      UUID    DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_bet_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_chosen_option NOT IN ('oui', 'non') THEN RAISE EXCEPTION 'Option invalide'; END IF;
  IF p_amount_staked < 10 THEN RAISE EXCEPTION 'Mise minimum : 10 Pts'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_events WHERE id = p_event_id AND status = 'open'
  ) THEN RAISE EXCEPTION 'event_not_open'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bets WHERE event_id = p_event_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'Pari déjà enregistré pour cet événement'; END IF;

  IF p_squad_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_id = p_squad_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'not_squad_member';
    END IF;
  END IF;

  SELECT sifflets_balance INTO v_balance
    FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount_staked THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  UPDATE public.profiles
    SET sifflets_balance = sifflets_balance - p_amount_staked
    WHERE id = v_user_id;

  INSERT INTO public.bets (user_id, event_id, chosen_option, amount_staked, potential_reward, squad_id)
  VALUES (
    v_user_id,
    p_event_id,
    p_chosen_option,
    p_amount_staked,
    FLOOR(p_amount_staked * GREATEST(p_multiplier, 1.0))::INTEGER,
    p_squad_id
  )
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bet(uuid, text, integer, numeric, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. resolve_event_parimutuel — braquage par squad_id (même événement)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_event_parimutuel(
  p_event_id UUID,
  p_result   TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_pool      BIGINT;
  v_winning_pool    BIGINT;
  v_multiplier      NUMERIC;
  v_bet             RECORD;
  v_reward          INTEGER;
  v_squad_id        UUID;
  v_chambrage_pool  BIGINT;
  v_league_win_pool BIGINT;
  v_bonus           INTEGER;
  v_winners         INTEGER := 0;
  v_total_paid      BIGINT  := 0;
  v_braquage_squads INTEGER := 0;
BEGIN
  UPDATE public.market_events
    SET status = 'resolved', result = p_result, resolved_at = NOW()
    WHERE id = p_event_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  SELECT
    COALESCE(SUM(amount_staked), 0),
    COALESCE(SUM(CASE WHEN chosen_option = p_result THEN amount_staked ELSE 0 END), 0)
  INTO v_total_pool, v_winning_pool
  FROM public.bets
  WHERE event_id = p_event_id AND status = 'pending';

  IF v_winning_pool = 0 THEN
    UPDATE public.bets SET status = 'lost' WHERE event_id = p_event_id AND status = 'pending';
    RETURN jsonb_build_object('winners', 0, 'total_paid', 0, 'multiplier', 0, 'braquage_squads', 0);
  END IF;

  v_multiplier := v_total_pool::NUMERIC / v_winning_pool::NUMERIC;

  FOR v_bet IN
    SELECT * FROM public.bets
    WHERE event_id = p_event_id AND status = 'pending'
    FOR UPDATE
  LOOP
    IF v_bet.chosen_option = p_result THEN
      v_reward := FLOOR(v_bet.amount_staked * v_multiplier)::INTEGER;

      UPDATE public.bets
        SET status = 'won', potential_reward = v_reward
        WHERE id = v_bet.id;

      UPDATE public.profiles
        SET sifflets_balance = sifflets_balance + v_reward,
            xp               = xp + GREATEST(5, v_reward / 10),
            updated_at       = NOW()
        WHERE id = v_bet.user_id;

      v_winners    := v_winners + 1;
      v_total_paid := v_total_paid + v_reward;
    ELSE
      UPDATE public.bets SET status = 'lost' WHERE id = v_bet.id;
    END IF;
  END LOOP;

  -- Bonus braquage : par squad, uniquement les paris de cet événement
  FOR v_squad_id IN
    SELECT DISTINCT squad_id
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount_staked), 0) INTO v_chambrage_pool
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'lost';

    IF v_chambrage_pool = 0 THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(amount_staked), 0) INTO v_league_win_pool
    FROM public.bets
    WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'won';

    IF v_league_win_pool = 0 THEN CONTINUE; END IF;

    FOR v_bet IN
      SELECT * FROM public.bets
      WHERE event_id = p_event_id AND squad_id = v_squad_id AND status = 'won'
      FOR UPDATE
    LOOP
      v_bonus := FLOOR(
        v_chambrage_pool::NUMERIC
        * v_bet.amount_staked::NUMERIC
        / v_league_win_pool::NUMERIC
      )::INTEGER;

      IF v_bonus > 0 THEN
        UPDATE public.profiles
          SET sifflets_balance = sifflets_balance + v_bonus,
              updated_at       = NOW()
          WHERE id = v_bet.user_id;

        UPDATE public.bets
          SET potential_reward = potential_reward + v_bonus
          WHERE id = v_bet.id;
      END IF;
    END LOOP;

    v_braquage_squads := v_braquage_squads + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'winners',         v_winners,
    'total_paid',      v_total_paid,
    'multiplier',      ROUND(v_multiplier, 4),
    'braquage_squads', v_braquage_squads
  );
END;
$$;

-- Résolution admin : même surface que l’historique `resolve_event` (voir `resolve-event.ts` → RPC ci-dessous)
GRANT EXECUTE ON FUNCTION public.resolve_event_parimutuel(uuid, text) TO service_role;

COMMENT ON TABLE public.squads IS 'Ligue privée persistante (sans match_id). Braquage : paris court terme avec bets.squad_id = id.';
COMMENT ON TABLE public.squad_members IS 'Membres d''une squad (user_id, squad_id).';
