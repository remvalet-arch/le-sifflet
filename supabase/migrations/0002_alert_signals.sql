-- Le Sifflet — signalements communautaires & cooldown VAR

-- Colonne cooldown sur matches (throttle des alertes)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS
  alert_cooldown_until timestamptz;

-- Table des signaux d'alerte
CREATE TABLE IF NOT EXISTS public.alert_signals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid        NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  action_type text        NOT NULL CHECK (action_type IN ('penalty', 'offside', 'card')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alert_signals_match_type_created_idx
  ON public.alert_signals (match_id, action_type, created_at DESC);

-- RLS
ALTER TABLE public.alert_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_signals_select_authenticated"
  ON public.alert_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "alert_signals_insert_own"
  ON public.alert_signals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grants
GRANT SELECT, INSERT ON public.alert_signals TO authenticated;
GRANT ALL ON public.alert_signals TO service_role;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_signals;
