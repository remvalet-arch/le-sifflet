-- CHAT-4 : Suivi des messages non lus par membre de ligue

ALTER TABLE squad_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;
