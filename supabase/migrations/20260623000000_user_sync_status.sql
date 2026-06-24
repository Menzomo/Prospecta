CREATE TABLE IF NOT EXISTS user_sync_status (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_email_sync timestamptz,
  last_call_sync  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_sync_status_user_unique UNIQUE (user_id)
);

ALTER TABLE user_sync_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sync_status: owner only" ON user_sync_status;
CREATE POLICY "user_sync_status: owner only"
  ON user_sync_status
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
