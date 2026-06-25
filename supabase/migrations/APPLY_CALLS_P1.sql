-- CALLS P1 — Migrations consolidadas
-- Colar e executar no Supabase Dashboard → SQL Editor
-- Ordem obrigatória: telephony_settings → calls → call_analyses → analysis_credits

-- 1. telephony_settings
CREATE TABLE IF NOT EXISTS telephony_settings (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_sid                 text        NOT NULL,
  auth_token_encrypted        text        NOT NULL,
  api_key_sid                 text,
  api_key_secret_encrypted    text,
  phone_number                text        NOT NULL,
  twiml_app_sid               text,
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telephony_settings_user_unique UNIQUE (user_id),
  CONSTRAINT telephony_settings_phone_e164 CHECK (phone_number ~ '^\+[1-9]\d{7,14}$')
);
ALTER TABLE telephony_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "telephony_settings: owner only" ON telephony_settings;
CREATE POLICY "telephony_settings: owner only"
  ON telephony_settings USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. calls
CREATE TABLE IF NOT EXISTS calls (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id               uuid        REFERENCES leads(id) ON DELETE SET NULL,
  user_lead_id          uuid        REFERENCES user_leads(id) ON DELETE SET NULL,
  call_sid              text        NOT NULL UNIQUE,
  to_number             text        NOT NULL,
  from_number           text        NOT NULL,
  direction             text        NOT NULL DEFAULT 'outbound',
  status                text        NOT NULL DEFAULT 'initiated',
  duration_seconds      integer,
  created_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  recording_sid         text,
  recording_url         text,
  recording_expires_at  timestamptz,
  recording_deleted_at  timestamptz,
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
CREATE INDEX IF NOT EXISTS calls_user_id_idx       ON calls(user_id);
CREATE INDEX IF NOT EXISTS calls_lead_id_idx       ON calls(lead_id)      WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calls_user_lead_id_idx  ON calls(user_lead_id) WHERE user_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calls_created_at_idx    ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS calls_recording_expires ON calls(recording_expires_at) WHERE recording_url IS NOT NULL;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calls: owner only" ON calls;
CREATE POLICY "calls: owner only" ON calls USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. call_analyses
CREATE TABLE IF NOT EXISTS call_analyses (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                   uuid        NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                    text        NOT NULL DEFAULT 'pending',
  transcript                text,
  summary                   text,
  key_points                jsonb,
  objections                jsonb,
  suggested_status          text,
  suggested_followup_days   integer,
  suggested_followup_notes  text,
  ai_model                  text,
  processing_started_at     timestamptz,
  processing_completed_at   timestamptz,
  error_message             text,
  credits_used              integer     NOT NULL DEFAULT 1,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_analyses_call_unique   UNIQUE (call_id),
  CONSTRAINT call_analyses_status_values CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT call_analyses_credits_pos   CHECK (credits_used >= 0)
);
CREATE INDEX IF NOT EXISTS call_analyses_user_id_idx ON call_analyses(user_id);
CREATE INDEX IF NOT EXISTS call_analyses_pending_idx ON call_analyses(status) WHERE status IN ('pending', 'processing');
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "call_analyses: owner only" ON call_analyses;
CREATE POLICY "call_analyses: owner only" ON call_analyses USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. analysis_credits
CREATE TABLE IF NOT EXISTS analysis_credits (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name       text        NOT NULL DEFAULT 'starter',
  credits_total   integer     NOT NULL DEFAULT 200,
  credits_used    integer     NOT NULL DEFAULT 0,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_credits_user_period    UNIQUE (user_id, period_start),
  CONSTRAINT analysis_credits_used_lte_total CHECK (credits_used <= credits_total),
  CONSTRAINT analysis_credits_non_negative   CHECK (credits_used >= 0 AND credits_total >= 0)
);
CREATE INDEX IF NOT EXISTS analysis_credits_user_period_idx ON analysis_credits(user_id, period_start DESC);
ALTER TABLE analysis_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analysis_credits: owner read" ON analysis_credits;
CREATE POLICY "analysis_credits: owner read" ON analysis_credits FOR SELECT USING (auth.uid() = user_id);
