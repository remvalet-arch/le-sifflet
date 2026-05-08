-- 0098_direct_messages.sql
-- Sprint MP : Messagerie privée entre amis
-- Deux tables : threads (une par paire d'amis) + messages (le contenu)
-- user_a_id < user_b_id (ordre canonique) garantit l'unicité de la paire.

CREATE TABLE IF NOT EXISTS public.direct_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  user_a_read_at TIMESTAMPTZ,
  user_b_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_canonical_order CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour récupérer rapidement les threads d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a ON public.direct_message_threads(user_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b ON public.direct_message_threads(user_b_id, last_message_at DESC NULLS LAST);
-- Index pour les messages d'un thread
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread_sent ON public.direct_messages(thread_id, sent_at DESC);

-- Realtime pour la conversation
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- RLS threads
ALTER TABLE public.direct_message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_threads_participant_select" ON public.direct_message_threads
  FOR SELECT USING (auth.uid() IN (user_a_id, user_b_id));

CREATE POLICY "dm_threads_participant_insert" ON public.direct_message_threads
  FOR INSERT WITH CHECK (auth.uid() IN (user_a_id, user_b_id));

CREATE POLICY "dm_threads_participant_update" ON public.direct_message_threads
  FOR UPDATE USING (auth.uid() IN (user_a_id, user_b_id));

-- RLS messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_messages_participant_select" ON public.direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = thread_id
        AND auth.uid() IN (t.user_a_id, t.user_b_id)
    )
  );

CREATE POLICY "dm_messages_sender_insert" ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = thread_id
        AND auth.uid() IN (t.user_a_id, t.user_b_id)
    )
  );

-- Préférence notifications DM
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notif_dm BOOLEAN NOT NULL DEFAULT true;
