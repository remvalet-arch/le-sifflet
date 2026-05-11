-- Sprint 11: Messagerie enrichie
-- 1. last_seen_at on profiles (DM presence)
-- 2. content_type + media_url on direct_messages (image/gif support)
-- 3. message_reactions table

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Presence: last_seen_at on profiles
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Media support on direct_messages
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('text', 'image', 'gif')),
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. message_reactions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions (message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select" ON message_reactions;
CREATE POLICY "reactions_select" ON message_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert" ON message_reactions;
CREATE POLICY "reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete" ON message_reactions;
CREATE POLICY "reactions_delete" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
