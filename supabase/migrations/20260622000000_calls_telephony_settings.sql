-- Telephony settings per user.
-- Stores Twilio credentials encrypted at rest using AES-256-GCM via TELEPHONY_MASTER_KEY env var.
-- auth_token_encrypted and api_key_secret_encrypted are never stored in plaintext.

CREATE TABLE telephony_settings (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio account credentials
  account_sid                 text        NOT NULL,
  auth_token_encrypted        text        NOT NULL,

  -- API Key credentials (for Twilio Voice SDK Access Tokens — preferred over Auth Token)
  api_key_sid                 text,
  api_key_secret_encrypted    text,

  -- Outbound caller ID
  phone_number                text        NOT NULL,

  -- TwiML App that routes calls to /api/calls/twiml
  twiml_app_sid               text,

  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT telephony_settings_user_unique UNIQUE (user_id),
  CONSTRAINT telephony_settings_phone_e164
    CHECK (phone_number ~ '^\+[1-9]\d{7,14}$')
);

ALTER TABLE telephony_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telephony_settings: owner only"
  ON telephony_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
