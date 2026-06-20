-- Add user_lead_id to followups so leads from the new flow (global_leads / user_leads)
-- can also have followups. lead_id is made nullable so a followup can belong to either
-- a legacy lead OR a user_lead (but always at least one via the CHECK constraint).

ALTER TABLE followups
  ADD COLUMN user_lead_id uuid REFERENCES user_leads(id) ON DELETE CASCADE;

-- Make lead_id nullable — existing rows all have lead_id set, so this is data-safe.
ALTER TABLE followups
  ALTER COLUMN lead_id DROP NOT NULL;

-- Enforce the invariant: every followup must reference exactly one of the two.
ALTER TABLE followups
  ADD CONSTRAINT followups_lead_or_user_lead_check
  CHECK (lead_id IS NOT NULL OR user_lead_id IS NOT NULL);

-- Index for efficient per-user_lead lookups.
CREATE INDEX idx_followups_user_lead_id ON followups(user_lead_id);
