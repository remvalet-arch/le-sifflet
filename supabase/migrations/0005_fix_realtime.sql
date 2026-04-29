-- Realtime sur market_events nécessite REPLICA IDENTITY FULL pour que les policies
-- RLS puissent être évaluées côté serveur Realtime — sans ça, les INSERTs sont
-- silencieusement ignorés pour les clients passifs.
ALTER TABLE public.market_events REPLICA IDENTITY FULL;

-- Ajout idempotent à la publication (évite l'erreur "already a member")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'market_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;
