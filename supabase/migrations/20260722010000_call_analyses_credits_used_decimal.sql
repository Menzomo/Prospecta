-- BUG: call_analyses.credits_used é integer, mas requestCallAnalysis() grava
-- o custo real em reais (ex: 0.08 pra 1 min de análise). O INSERT via
-- PostgREST falha com "invalid input syntax for type integer" — e como o
-- débito da wallet já aconteceu ANTES desse INSERT, todo pedido de análise
-- cobra o usuário e depois retorna erro, sem nunca criar o registro.

ALTER TABLE call_analyses
  ALTER COLUMN credits_used TYPE decimal(10,4) USING credits_used::decimal(10,4);
