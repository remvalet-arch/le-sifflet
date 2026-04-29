-- Le Sifflet — schéma initial (MVP)
-- Appliquer dans Supabase SQL Editor ou via CLI: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (PRD "users" → lié à auth.users, pas de duplication)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL,
  sifflets_balance integer NOT NULL DEFAULT 1000
    CHECK (sifflets_balance >= 0),
  winrate numeric(6, 3) NOT NULL DEFAULT 0
    CHECK (winrate >= 0 AND winrate <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_len CHECK (char_length(username) >= 1 AND char_length(username) <= 32)
);

CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username));

COMMENT ON TABLE public.profiles IS 'Profil joueur ; id = auth.users.id. Solde modifié par RPC/service_role plus tard.';

-- ---------------------------------------------------------------------------
-- Matchs & rooms
-- ---------------------------------------------------------------------------
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_home text NOT NULL,
  team_away text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'live', 'finished')),
  start_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX matches_status_start_idx ON public.matches (status, start_time DESC);

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  name text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  invite_code text,
  admin_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_invite_private_ck CHECK (
    (is_private = false AND invite_code IS NULL)
    OR (is_private = true AND invite_code IS NOT NULL)
  )
);

CREATE UNIQUE INDEX rooms_invite_code_unique ON public.rooms (invite_code)
  WHERE invite_code IS NOT NULL;

CREATE INDEX rooms_match_id_idx ON public.rooms (match_id);

CREATE TABLE public.room_members (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

CREATE INDEX room_members_room_id_idx ON public.room_members (room_id);

-- ---------------------------------------------------------------------------
-- Marchés & paris
-- ---------------------------------------------------------------------------
CREATE TABLE public.market_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('penalty', 'offside', 'card')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'resolved')),
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX market_events_match_created_idx ON public.market_events (match_id, created_at DESC);
CREATE INDEX market_events_match_status_idx ON public.market_events (match_id, status);

CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.market_events (id) ON DELETE CASCADE,
  chosen_option text NOT NULL,
  amount_staked integer NOT NULL CHECK (amount_staked > 0),
  potential_reward numeric(14, 4) NOT NULL CHECK (potential_reward >= 0),
  placed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'won', 'lost'))
);

CREATE INDEX bets_user_id_idx ON public.bets (user_id);
CREATE INDEX bets_event_id_idx ON public.bets (event_id);

COMMENT ON COLUMN public.bets.placed_at IS 'Horodatage du pari (équivalent PRD "timestamp").';

-- ---------------------------------------------------------------------------
-- Trigger : profil + 1000 Sifflets à l''inscription
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name text;
  final_name text;
BEGIN
  base_name := COALESCE(
    NULLIF(trim(new.raw_user_meta_data ->> 'username'), ''),
    NULLIF(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(split_part(COALESCE(new.email, ''), '@', 1), ''),
    'joueur'
  );
  base_name := regexp_replace(left(base_name, 20), '[^a-zA-Z0-9_]', '_', 'g');
  IF base_name IS NULL OR base_name = '' THEN
    base_name := 'joueur';
  END IF;
  final_name := base_name || '_' || left(replace(new.id::text, '-', ''), 8);

  INSERT INTO public.profiles (id, username, sifflets_balance)
  VALUES (new.id, final_name, 1000);

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username, sifflets_balance)
    VALUES (new.id, 'joueur_' || left(replace(new.id::text, '-', ''), 12), 1000);
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- profiles: lecture pour joueurs connectés ; mise à jour de sa ligne uniquement
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- matches: lecture seule côté client (écriture dashboard / service_role)
CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

-- rooms: création si admin = soi ; lecture si publique ou membre
CREATE POLICY "rooms_select_visible"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert_as_admin"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "rooms_update_own_admin"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- room_members: lecture si room visible ; insert soi-même ; delete soi-même
CREATE POLICY "room_members_select_visible"
  ON public.room_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_members.room_id
        AND (
          r.is_private = false
          OR r.admin_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.room_members rm2
            WHERE rm2.room_id = r.id AND rm2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "room_members_insert_self"
  ON public.room_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "room_members_delete_self"
  ON public.room_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- market_events: lecture pour utilisateurs connectés (MVP Realtime)
CREATE POLICY "market_events_select_authenticated"
  ON public.market_events FOR SELECT
  TO authenticated
  USING (true);

-- bets: uniquement ses lignes
CREATE POLICY "bets_select_own"
  ON public.bets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bets_insert_own"
  ON public.bets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (Supabase : RLS filtre au-dessus des privilèges de base)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Profil : pas de UPDATE globale (évite triche sur solde / winrate côté client)
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;
GRANT ALL ON public.matches TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.matches FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;
GRANT SELECT ON public.market_events TO authenticated;
GRANT SELECT, INSERT ON public.bets TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- service_role bypass RLS ; conservons grants explicites pour le dashboard

-- ---------------------------------------------------------------------------
-- Realtime : tables à diffuser en WebSocket
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
