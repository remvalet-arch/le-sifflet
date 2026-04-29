-- Active la diffusion Realtime pour les mises à jour de matches (cooldown, statut)
-- REPLICA IDENTITY FULL : permet de filtrer les events par colonne non-PK
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
