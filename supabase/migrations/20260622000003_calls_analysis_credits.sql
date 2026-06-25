-- Monthly credit balance for AI call analyses.
-- Deductions must be atomic: UPDATE ... WHERE credits_used < credits_total RETURNING id.
-- Write access is service-role only (server-side actions). Users can only read their own balance.

CREATE TABLE analysis_credits (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name       text        NOT NULL DEFAULT 'starter',
  credits_total   integer     NOT NULL DEFAULT 200,
  credits_used    integer     NOT NULL DEFAULT 0,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT analysis_credits_user_period   UNIQUE (user_id, period_start),
  CONSTRAINT analysis_credits_used_lte_total CHECK (credits_used <= credits_total),
  CONSTRAINT analysis_credits_non_negative   CHECK (credits_used >= 0 AND credits_total >= 0)
);

CREATE INDEX analysis_credits_user_period_idx ON analysis_credits(user_id, period_start DESC);

ALTER TABLE analysis_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own balance. Write is handled server-side only (service role bypasses RLS).
CREATE POLICY "analysis_credits: owner read"
  ON analysis_credits FOR SELECT
  USING (auth.uid() = user_id);
