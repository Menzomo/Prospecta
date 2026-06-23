-- Call records. Follows the dual lead_id / user_lead_id pattern from email_messages and followups.
-- Exactly one of lead_id / user_lead_id must be set (XOR constraint).

CREATE TABLE calls (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id               uuid        REFERENCES leads(id) ON DELETE SET NULL,
  user_lead_id          uuid        REFERENCES user_leads(id) ON DELETE SET NULL,

  -- Twilio call identifiers
  call_sid              text        NOT NULL UNIQUE,
  to_number             text        NOT NULL,
  from_number           text        NOT NULL,
  direction             text        NOT NULL DEFAULT 'outbound',

  -- Call lifecycle
  status                text        NOT NULL DEFAULT 'initiated',

  -- Duration and timing
  duration_seconds      integer,
  created_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,

  -- Recording (populated after Twilio callback + transfer to Supabase Storage)
  recording_sid         text,
  recording_url         text,
  recording_expires_at  timestamptz,
  recording_deleted_at  timestamptz,

  -- Free-form notes added by the user after the call
  notes                 text,

  CONSTRAINT calls_lead_xor CHECK (
    (lead_id IS NOT NULL AND user_lead_id IS NULL) OR
    (lead_id IS NULL AND user_lead_id IS NOT NULL)
  ),
  CONSTRAINT calls_direction_values CHECK (direction IN ('outbound', 'inbound')),
  CONSTRAINT calls_status_values CHECK (status IN (
    'initiated', 'ringing', 'in-progress', 'completed',
    'failed', 'no-answer', 'busy', 'canceled'
  ))
);

CREATE INDEX calls_user_id_idx       ON calls(user_id);
CREATE INDEX calls_lead_id_idx       ON calls(lead_id)      WHERE lead_id IS NOT NULL;
CREATE INDEX calls_user_lead_id_idx  ON calls(user_lead_id) WHERE user_lead_id IS NOT NULL;
CREATE INDEX calls_created_at_idx    ON calls(created_at DESC);
CREATE INDEX calls_recording_expires ON calls(recording_expires_at) WHERE recording_url IS NOT NULL;

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls: owner only"
  ON calls
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
