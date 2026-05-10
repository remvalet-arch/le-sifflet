-- Script manuel à exécuter une seule fois par le founder dans le SQL Editor Supabase.
-- Remplacer <FOUNDER_USER_ID> par l'UUID du compte founder (visible dans Auth > Users).

-- UPDATE public.profiles SET role = 'founder' WHERE id = '<FOUNDER_USER_ID>';

-- Pour promouvoir un modérateur :
-- UPDATE public.profiles SET role = 'moderator' WHERE id = '<USER_ID>';

-- Pour rétrograder :
-- UPDATE public.profiles SET role = 'user' WHERE id = '<USER_ID>';

-- Vérification :
-- SELECT id, username, role FROM public.profiles WHERE role != 'user';
