-- Migration 0018 : RLS lecture publique sur lineups
-- Fix bug : lecteurs authentifiés ne pouvaient pas lire les compositions dans le Drawer

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

-- DROP avant CREATE pour rendre la migration idempotente (IF NOT EXISTS n'existe pas pour les policies)
DROP POLICY IF EXISTS "lineups_select_authenticated" ON public.lineups;
DROP POLICY IF EXISTS "lineups_service_write" ON public.lineups;

-- Tout utilisateur authentifié peut lire les compositions
CREATE POLICY "lineups_select_authenticated" ON public.lineups
  FOR SELECT TO authenticated USING (true);

-- Seul le service_role peut écrire
CREATE POLICY "lineups_service_write" ON public.lineups
  FOR ALL TO service_role USING (true);
