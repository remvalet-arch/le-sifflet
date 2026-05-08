-- CHAT-1 : Message système de bienvenue dans les chats de ligue

-- 1. Ajouter le flag is_system_message
ALTER TABLE squad_messages
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Permettre user_id NULL pour les messages système
ALTER TABLE squad_messages
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Backfill : message de bienvenue pour toutes les ligues sans messages
INSERT INTO squad_messages (squad_id, user_id, content, is_system_message)
SELECT
  s.id,
  NULL,
  '🎉 Bienvenue dans **' || s.name || '** ! Présentez-vous, chambrez-vous, et que le Boss de la VAR remporte le mois ! 🏆',
  TRUE
FROM squads s
WHERE NOT EXISTS (
  SELECT 1 FROM squad_messages sm WHERE sm.squad_id = s.id
);
