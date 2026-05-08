-- Sprint Eco-2 : Boutique cosmétique
-- Tables: shop_items, user_shop_inventory
-- Profile columns: equipped_avatar_id, equipped_border_id, equipped_effect_id
-- RPCs: purchase_shop_item, equip_shop_item

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shop_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('avatar', 'border', 'effect')),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price_pts    INT  NOT NULL DEFAULT 0,
  unlock_rank  TEXT NULL,  -- e.g. 'bronze', 'argent', 'boss' — free claim at rank, OR buy with pts
  asset_url    TEXT NOT NULL DEFAULT '',  -- emoji for avatars, css-key for borders/effects
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_items_select_all"
  ON public.shop_items FOR SELECT USING (true);

-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_shop_inventory (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_equipped  BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, shop_item_id)
);

ALTER TABLE public.user_shop_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_select_own"
  ON public.user_shop_inventory FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "inventory_insert_own"
  ON public.user_shop_inventory FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "inventory_update_own"
  ON public.user_shop_inventory FOR UPDATE USING (user_id = auth.uid());

-- ─────────────────────────────────────────
-- PROFILE COLUMNS
-- ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_avatar_id UUID NULL REFERENCES public.shop_items(id),
  ADD COLUMN IF NOT EXISTS equipped_border_id UUID NULL REFERENCES public.shop_items(id),
  ADD COLUMN IF NOT EXISTS equipped_effect_id UUID NULL REFERENCES public.shop_items(id);

-- ─────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────

-- Avatars (4 rank-unlock, 4 premium pts)
INSERT INTO public.shop_items (slug, category, name, description, price_pts, unlock_rank, asset_url) VALUES
  ('avatar-district', 'avatar', 'Blaze', 'L''arbitre débutant qui s''enflamme.', 0, 'district', '🔥'),
  ('avatar-bronze',   'avatar', 'Lion Bronze', 'Pour les arbitres qui ont prouvé leur valeur.', 500, 'bronze', '🦁'),
  ('avatar-argent',   'avatar', 'Loup Argent', 'Les meilleurs arbitres de district.', 1000, 'argent', '🐺'),
  ('avatar-boss',     'avatar', 'Aigle Boss', 'Réservé à l''élite — les arbitres à temps plein.', 2000, 'boss', '🦅'),
  ('avatar-premium-1', 'avatar', 'Diamant Noir', 'Statut rare pour les grands collectionneurs.', 1500, NULL, '💎'),
  ('avatar-premium-2', 'avatar', 'Couronne', 'Arbiter supremus. Le plus grand de tous.', 3000, NULL, '👑'),
  ('avatar-premium-3', 'avatar', 'Fantôme', 'L''arbitre invisible — toujours juste, jamais vu.', 2000, NULL, '👻'),
  ('avatar-premium-4', 'avatar', 'Éclair', 'Décision rapide comme l''éclair.', 2500, NULL, '⚡')
ON CONFLICT (slug) DO NOTHING;

-- Bordures (CSS identifiers — applied as ring styles client-side)
INSERT INTO public.shop_items (slug, category, name, description, price_pts, asset_url) VALUES
  ('border-gold',   'border', 'Or Vibrant',   'Un halo doré qui brille comme la victoire.', 3000, 'gold'),
  ('border-neon',   'border', 'Néon Vert',    'Halo électrique pour les loups de nuit.', 3500, 'neon'),
  ('border-inferno','border', 'Inferno',       'Flammes ardentes autour de ton arbitre.', 4000, 'inferno'),
  ('border-elite',  'border', 'Élite Pourpre', 'La bordure des arbitres qui ont tout gagné.', 5000, 'elite')
ON CONFLICT (slug) DO NOTHING;

-- Effets de pari (consommables — intégration dans Eco-3, ici déclarés)
INSERT INTO public.shop_items (slug, category, name, description, price_pts, asset_url) VALUES
  ('effect-lightning', 'effect', 'Flash Decision', 'Ton pari brille d''un éclair au moment de la mise.', 500, 'lightning'),
  ('effect-fire',      'effect', 'Fire Bet',        'Des flammes s''élèvent sur ta mise — visible par tous.', 500, 'fire'),
  ('effect-crown',     'effect', 'Royal Bet',       'Couronne dorée sur ta mise — tu règnes.', 500, 'crown')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────
-- RPC : purchase_shop_item
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_item       shop_items%ROWTYPE;
  v_user_rank  TEXT;
  v_actual_price INT;
  v_new_balance  INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié"}'::JSONB;
  END IF;

  -- Fetch item
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN '{"ok":false,"error":"Item non disponible"}'::JSONB;
  END IF;

  -- Already owned?
  IF EXISTS (SELECT 1 FROM user_shop_inventory WHERE user_id = v_user_id AND shop_item_id = p_item_id) THEN
    RETURN '{"ok":false,"error":"Déjà dans ton inventaire"}'::JSONB;
  END IF;

  -- Check rank-based free unlock
  v_actual_price := v_item.price_pts;
  IF v_item.unlock_rank IS NOT NULL THEN
    SELECT rank INTO v_user_rank FROM profiles WHERE id = v_user_id;
    IF lower(v_user_rank) LIKE '%' || lower(v_item.unlock_rank) || '%'
       OR lower(v_item.unlock_rank) = 'district' THEN
      v_actual_price := 0;
    END IF;
  END IF;

  -- Debit balance (or free)
  IF v_actual_price > 0 THEN
    UPDATE profiles
    SET sifflets_balance = sifflets_balance - v_actual_price
    WHERE id = v_user_id AND sifflets_balance >= v_actual_price
    RETURNING sifflets_balance INTO v_new_balance;

    IF NOT FOUND THEN
      RETURN '{"ok":false,"error":"Solde insuffisant"}'::JSONB;
    END IF;
  ELSE
    SELECT sifflets_balance INTO v_new_balance FROM profiles WHERE id = v_user_id;
  END IF;

  -- Grant item
  INSERT INTO user_shop_inventory (user_id, shop_item_id)
  VALUES (v_user_id, p_item_id);

  RETURN jsonb_build_object(
    'ok',          true,
    'new_balance', v_new_balance,
    'item_id',     p_item_id,
    'free',        (v_actual_price = 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_shop_item(UUID) TO authenticated;

-- ─────────────────────────────────────────
-- RPC : equip_shop_item
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.equip_shop_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_category TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié"}'::JSONB;
  END IF;

  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM user_shop_inventory
    WHERE user_id = v_user_id AND shop_item_id = p_item_id
  ) THEN
    RETURN '{"ok":false,"error":"Item non possédé"}'::JSONB;
  END IF;

  -- Get category
  SELECT category INTO v_category FROM shop_items WHERE id = p_item_id;

  -- Update equipped column on profile (only one per category)
  IF v_category = 'avatar' THEN
    UPDATE profiles SET equipped_avatar_id = p_item_id WHERE id = v_user_id;
  ELSIF v_category = 'border' THEN
    UPDATE profiles SET equipped_border_id = p_item_id WHERE id = v_user_id;
  ELSIF v_category = 'effect' THEN
    UPDATE profiles SET equipped_effect_id = p_item_id WHERE id = v_user_id;
  ELSE
    RETURN '{"ok":false,"error":"Catégorie inconnue"}'::JSONB;
  END IF;

  -- Mark is_equipped
  UPDATE user_shop_inventory
  SET is_equipped = (shop_item_id = p_item_id)
  WHERE user_id = v_user_id
    AND shop_item_id IN (
      SELECT id FROM shop_items WHERE category = v_category
    );

  RETURN jsonb_build_object('ok', true, 'category', v_category);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_shop_item(UUID) TO authenticated;

-- ─────────────────────────────────────────
-- RPC : unequip_shop_item
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unequip_shop_item(p_category TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié"}'::JSONB;
  END IF;

  IF p_category = 'avatar' THEN
    UPDATE profiles SET equipped_avatar_id = NULL WHERE id = v_user_id;
  ELSIF p_category = 'border' THEN
    UPDATE profiles SET equipped_border_id = NULL WHERE id = v_user_id;
  ELSIF p_category = 'effect' THEN
    UPDATE profiles SET equipped_effect_id = NULL WHERE id = v_user_id;
  END IF;

  UPDATE user_shop_inventory usi
  SET is_equipped = false
  WHERE usi.user_id = v_user_id
    AND usi.shop_item_id IN (SELECT id FROM shop_items WHERE category = p_category);

  RETURN '{"ok":true}'::JSONB;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unequip_shop_item(TEXT) TO authenticated;
