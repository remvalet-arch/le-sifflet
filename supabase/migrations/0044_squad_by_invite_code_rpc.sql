-- Rejoindre une ligue privée : SELECT sur squads par invite_code est masqué par RLS
-- pour un utilisateur non membre / non owner. Cette RPC (SECURITY DEFINER) résout la ligne
-- uniquement si le code correspond (comparaison insensible à la casse / espaces).

CREATE OR REPLACE FUNCTION public.squad_by_invite_code(p_invite text)
RETURNS SETOF public.squads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.squads s
  WHERE s.invite_code IS NOT NULL
    AND upper(trim(s.invite_code)) = upper(trim(p_invite))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.squad_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.squad_by_invite_code(text) TO authenticated;
