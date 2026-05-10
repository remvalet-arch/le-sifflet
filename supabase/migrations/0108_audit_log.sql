-- Migration 0108 : Table audit_log pour toutes les actions admin
-- INSERT uniquement via service_role (adminClient côté app).
-- Lecture uniquement pour les admins (via RLS + is_admin()).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id        uuid          NOT NULL REFERENCES auth.users(id),
  actor_role           public.user_role NOT NULL,
  action_type          text          NOT NULL,
  target_resource_type text,
  target_resource_id   uuid,
  metadata             jsonb         NOT NULL DEFAULT '{}',
  ip_address           text,
  user_agent           text,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON public.audit_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON public.audit_log(target_resource_type, target_resource_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire
CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Personne ne peut INSERT/UPDATE/DELETE via client — uniquement via service_role
