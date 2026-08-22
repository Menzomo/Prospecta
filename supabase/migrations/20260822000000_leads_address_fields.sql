-- Feature Visitas: leads precisam de endereço/coordenadas pra calcular rota.
-- global_leads (leads de busca) ganham isso automaticamente na importação
-- Apify (que já retorna esses campos e hoje descarta — ver sync/route.ts).
-- leads (manuais) e leads antigos sem endereço usam CNPJ → BrasilAPI como
-- alternativa (cnpjEnrichmentService.ts).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS address   text,
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS cnpj      text;

ALTER TABLE global_leads
  ADD COLUMN IF NOT EXISTS address   text,
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS cnpj      text;
