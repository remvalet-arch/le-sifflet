-- Squad chat messages
CREATE TABLE public.squad_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id   uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.squad_messages(squad_id, created_at DESC);

ALTER TABLE public.squad_messages ENABLE ROW LEVEL SECURITY;

-- Members of the squad can read messages
CREATE POLICY "squad_messages_select" ON public.squad_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_messages.squad_id
        AND sm.user_id = auth.uid()
    )
  );

-- Members can insert their own messages
CREATE POLICY "squad_messages_insert" ON public.squad_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_messages.squad_id
        AND sm.user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_messages;
ALTER TABLE public.squad_messages REPLICA IDENTITY FULL;
