-- DT-LEADS-ENRICHMENT — Enriquecimento e pipeline de qualidade de leads
-- Colar e executar no Supabase Dashboard → SQL Editor

-- 1. Novos campos de tracking
ALTER TABLE global_leads
  ADD COLUMN IF NOT EXISTS last_enrichment_at  timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at         timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason    text;

-- 2. Recalcular lead_quality_status baseado nos campos reais de contato
--    Só atualiza linhas que ainda têm os valores antigos (idempotente)
UPDATE global_leads
SET lead_quality_status = CASE
  WHEN email IS NOT NULL AND phone IS NOT NULL THEN 'complete'
  WHEN email IS NOT NULL AND phone IS NULL     THEN 'email_only'
  WHEN email IS NULL     AND phone IS NOT NULL THEN 'phone_only'
  ELSE 'incomplete'
END
WHERE lead_quality_status NOT IN ('complete', 'email_only', 'phone_only', 'incomplete');

-- 3. Migrar status para novos valores
--    Leads ativos ficam ativos; inválidos → rejected; outros → pending_review
UPDATE global_leads
SET status = CASE
  WHEN status = 'invalid' THEN 'rejected'
  WHEN status = 'active'  THEN 'active'
  ELSE 'pending_review'
END
WHERE status NOT IN ('pending_enrichment', 'pending_review', 'active', 'rejected');

-- 4. Preencher approved_at para leads que já estavam ativos (aprovação implícita)
UPDATE global_leads
SET approved_at = created_at
WHERE status = 'active' AND approved_at IS NULL;
