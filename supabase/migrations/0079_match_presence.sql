-- Sprint Q : Compteur d'audience temps réel par match
-- Chaque upsert depuis LiveRoom met à jour last_seen_at

CREATE TABLE public.match_presence (
  match_id     UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX idx_match_presence_lookup
  ON public.match_presence(match_id, last_seen_at DESC);

ALTER TABLE public.match_presence ENABLE ROW LEVEL SECURITY;

-- Lecture publique (compteur non-sensible)
CREATE POLICY "match_presence_select" ON public.match_presence
  FOR SELECT USING (true);

-- Upsert limité à son propre row
CREATE POLICY "match_presence_insert" ON public.match_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "match_presence_update" ON public.match_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- RPC : retourne le nombre d'users actifs sur un match dans une fenêtre de temps
CREATE OR REPLACE FUNCTION public.count_active_users_on_match(
  p_match_id      UUID,
  p_window_minutes INT DEFAULT 5
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INT
  FROM public.match_presence
  WHERE match_id = p_match_id
    AND last_seen_at > now() - (p_window_minutes || ' minutes')::INTERVAL;
$$;

GRANT EXECUTE ON FUNCTION public.count_active_users_on_match(UUID, INT) TO anon, authenticated;

-- Cleanup automatique (Postgres cron via pg_cron si disponible, sinon cron Vercel)
-- Supprime les rows inactives depuis plus d'1 heure
CREATE OR REPLACE FUNCTION public.cleanup_match_presence()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.match_presence
  WHERE last_seen_at < now() - INTERVAL '1 hour';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_match_presence() TO service_role;
