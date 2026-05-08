-- 0096_squad_chat_push.sql
-- Activation des push notifications sur les chats de ligue (CHAT-3)

-- Toggle utilisateur
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_squad_chat BOOLEAN NOT NULL DEFAULT true;

-- Cooldown 30min par squad (1 push max / squad / 30min)
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS chat_last_push_at TIMESTAMPTZ;
