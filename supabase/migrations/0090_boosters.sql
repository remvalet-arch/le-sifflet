-- Sprint Eco-3 : Boosters consommables
-- Tables: boosters_catalog, user_boosters_inventory, booster_highlights
-- Colonnes: applied_booster_id sur bets et pronos
-- RPC: purchase_booster

-- ─────────────────────────────────────────
-- TABLE boosters_catalog
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boosters_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price_pts    INT  NOT NULL DEFAULT 0,
  effect_type  TEXT NOT NULL CHECK (effect_type IN ('double_xp','cote_plus','safety_net','vision')),
  effect_value JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boosters_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boosters_catalog_select_all"
  ON public.boosters_catalog FOR SELECT USING (true);

-- ─────────────────────────────────────────
-- TABLE user_boosters_inventory
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_boosters_inventory (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booster_id            UUID NOT NULL REFERENCES public.boosters_catalog(id),
  acquired_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at           TIMESTAMPTZ NULL,
  consumed_on_event_id  UUID NULL REFERENCES public.market_events(id),
  consumed_on_prono_id  UUID NULL REFERENCES public.pronos(id)
);

CREATE INDEX IF NOT EXISTS user_boosters_user_idx ON public.user_boosters_inventory(user_id);

ALTER TABLE public.user_boosters_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_boosters_select_own"
  ON public.user_boosters_inventory FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_boosters_insert_own"
  ON public.user_boosters_inventory FOR INSERT WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT ON public.user_boosters_inventory TO authenticated;
GRANT ALL ON public.user_boosters_inventory TO service_role;

-- ─────────────────────────────────────────
-- TABLE booster_highlights
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booster_highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booster_id    UUID NOT NULL REFERENCES public.boosters_catalog(id),
  match_id      UUID NULL REFERENCES public.matches(id),
  base_reward   INT NOT NULL,
  boosted_reward INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booster_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booster_highlights_select_own"
  ON public.booster_highlights FOR SELECT USING (user_id = auth.uid());
GRANT SELECT ON public.booster_highlights TO authenticated;
GRANT ALL ON public.booster_highlights TO service_role;

-- ─────────────────────────────────────────
-- COLONNES applied_booster_id
-- ─────────────────────────────────────────

ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS applied_booster_id UUID NULL REFERENCES public.boosters_catalog(id);

ALTER TABLE public.pronos
  ADD COLUMN IF NOT EXISTS applied_booster_id UUID NULL REFERENCES public.boosters_catalog(id);

-- ─────────────────────────────────────────
-- SEED
-- ─────────────────────────────────────────

INSERT INTO public.boosters_catalog (slug, name, description, price_pts, effect_type, effect_value) VALUES
  ('double_xp',   'Double XP',     'Ton prochain pari/prono gagnant rapporte 2× plus de points.', 300, 'double_xp',   '{"multiplier": 2}'),
  ('cote_plus',   'Cote+',         'Ta récompense potentielle est augmentée de 20%.', 200, 'cote_plus',   '{"bonus_pct": 20}'),
  ('safety_net',  'Filet de Sécurité', 'Si tu perds, tu récupères 50% de ta mise/récompense potentielle.', 500, 'safety_net',  '{"recovery_pct": 50}'),
  ('vision',      'Vision',        'Révèle les pronos détaillés de tes amis sur ce match.', 100, 'vision',      '{}')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────
-- RPC : purchase_booster
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_booster(
  p_booster_id UUID,
  p_quantity   INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_booster     boosters_catalog%ROWTYPE;
  v_total_cost  INT;
  v_new_balance INT;
  v_i           INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié"}'::JSONB;
  END IF;

  IF p_quantity < 1 OR p_quantity > 10 THEN
    RETURN '{"ok":false,"error":"Quantité invalide (1-10)"}'::JSONB;
  END IF;

  SELECT * INTO v_booster FROM boosters_catalog WHERE id = p_booster_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN '{"ok":false,"error":"Booster non disponible"}'::JSONB;
  END IF;

  v_total_cost := v_booster.price_pts * p_quantity;

  -- Débit atomique
  UPDATE profiles
  SET sifflets_balance = sifflets_balance - v_total_cost
  WHERE id = v_user_id AND sifflets_balance >= v_total_cost
  RETURNING sifflets_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN '{"ok":false,"error":"Solde insuffisant"}'::JSONB;
  END IF;

  -- Insert quantity rows
  FOR v_i IN 1..p_quantity LOOP
    INSERT INTO user_boosters_inventory (user_id, booster_id)
    VALUES (v_user_id, p_booster_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok',          true,
    'new_balance', v_new_balance,
    'quantity',    p_quantity,
    'booster_id',  p_booster_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_booster(UUID, INT) TO authenticated;
