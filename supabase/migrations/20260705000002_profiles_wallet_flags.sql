-- Flags de controle de boas-vindas e cota de leads no onboarding
-- welcome_credited     → garante que R$10 só é creditado uma vez por conta
-- welcome_leads_total  → cota total de leads disponíveis (150 iniciais + compras)
-- welcome_leads_used   → quantos leads já foram importados via Buscar Leads

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_credited    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_leads_total integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS welcome_leads_used  integer NOT NULL DEFAULT 0;
