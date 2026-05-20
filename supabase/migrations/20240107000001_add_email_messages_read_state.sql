ALTER TABLE email_messages
  ADD COLUMN is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN read_at timestamptz NULL;
