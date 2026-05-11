-- Sprint 7bis: notification improvements
-- 1. notif_friend_request preference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_friend_request BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. In-app notifications table (for the notification bell)
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- 'friend_request' | 'dm'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  url        TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications (user_id, read) WHERE read = FALSE;

ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
