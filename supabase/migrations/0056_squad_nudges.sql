-- 0056 : Historique des nudges (pronos reminder + VAR panic button)
-- Sert à appliquer le cooldown côté serveur.

CREATE TABLE IF NOT EXISTS public.squad_nudge_logs (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id  UUID        REFERENCES public.squads  (id) ON DELETE CASCADE,
  sent_by   UUID        REFERENCES public.profiles (id) ON DELETE CASCADE,
  nudge_type TEXT       NOT NULL CHECK (nudge_type IN ('prono', 'var_alert')),
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS squad_nudge_logs_squad_type_idx
  ON public.squad_nudge_logs (squad_id, nudge_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS squad_nudge_logs_user_idx
  ON public.squad_nudge_logs (sent_by, nudge_type, sent_at DESC);

ALTER TABLE public.squad_nudge_logs ENABLE ROW LEVEL SECURITY;

-- Lecture uniquement pour les membres de sa propre squad (via service_role pour les writes)
CREATE POLICY "nudge_logs_read_own"
  ON public.squad_nudge_logs FOR SELECT TO authenticated
  USING (sent_by = auth.uid());

GRANT SELECT ON public.squad_nudge_logs TO authenticated;
GRANT ALL ON public.squad_nudge_logs TO service_role;
