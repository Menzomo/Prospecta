-- AI analysis result for a call. 1:1 with calls (unique on call_id).
-- Populated asynchronously by n8n → Gemini pipeline after user requests analysis.

CREATE TABLE call_analyses (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                   uuid        NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Processing state
  status                    text        NOT NULL DEFAULT 'pending',

  -- AI output fields (null until status = completed)
  transcript                text,
  summary                   text,
  key_points                jsonb,
  objections                jsonb,
  suggested_status          text,
  suggested_followup_days   integer,
  suggested_followup_notes  text,

  -- Processing metadata
  ai_model                  text,
  processing_started_at     timestamptz,
  processing_completed_at   timestamptz,
  error_message             text,

  -- Credit accounting
  credits_used              integer     NOT NULL DEFAULT 1,

  created_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT call_analyses_call_unique   UNIQUE (call_id),
  CONSTRAINT call_analyses_status_values CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT call_analyses_credits_pos   CHECK (credits_used >= 0)
);

CREATE INDEX call_analyses_user_id_idx ON call_analyses(user_id);
CREATE INDEX call_analyses_pending_idx ON call_analyses(status) WHERE status IN ('pending', 'processing');

ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_analyses: owner only"
  ON call_analyses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
