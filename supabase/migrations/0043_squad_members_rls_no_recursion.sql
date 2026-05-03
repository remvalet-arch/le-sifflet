-- 0043 : brise la récursion RLS « infinite recursion detected in policy for relation squad_members »
-- La policy SELECT sur squad_members ne doit pas lire `squads` (qui relisait squad_members).
-- Déploiements déjà passés par 0041 : exécuter ce fichier (SQL Editor ou `supabase db push`).

DROP POLICY IF EXISTS "squad_members_select_visible" ON public.squad_members;

CREATE POLICY "squad_members_select_visible"
  ON public.squad_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.squad_members_for_my_squads()
RETURNS TABLE (squad_id uuid, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.squad_id, sm.user_id
  FROM public.squad_members sm
  WHERE EXISTS (
    SELECT 1 FROM public.squad_members me
    WHERE me.squad_id = sm.squad_id AND me.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.squads s
    WHERE s.id = sm.squad_id AND s.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.squad_members_for_my_squads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.squad_members_for_my_squads() TO authenticated;
