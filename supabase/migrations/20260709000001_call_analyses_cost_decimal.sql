-- Fase 4: credits_used passa a armazenar custo em reais (decimal)
-- Antes: integer DEFAULT 1 (número de créditos inteiros do sistema antigo)
-- Agora: decimal(10,4) DEFAULT 0 (custo em reais — ex: 0.0800 para 1 min de análise)

ALTER TABLE call_analyses
  DROP CONSTRAINT IF EXISTS call_analyses_credits_pos;

ALTER TABLE call_analyses
  ALTER COLUMN credits_used SET DATA TYPE decimal(10,4),
  ALTER COLUMN credits_used SET DEFAULT 0;

ALTER TABLE call_analyses
  ADD CONSTRAINT call_analyses_credits_pos CHECK (credits_used >= 0);
