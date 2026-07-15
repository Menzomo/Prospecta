-- A policy RLS "calls: owner only" (20260622000001) não tem cláusula FOR,
-- então cobre UPDATE em todas as colunas — inclusive duration_seconds, status,
-- call_sid e as colunas de gravação. Isso permite que o dono da linha edite
-- duration_seconds diretamente via REST do Supabase (fora do app), o que afeta
-- o débito de análise de IA em requestCallAnalysis (callService.ts), que relê
-- duration_seconds do banco na hora de calcular o custo.
--
-- `notes` continua editável pelo usuário (fluxo existente: saveCallNotesAction).
-- Todas as outras colunas passam a exigir o service role (admin client), que já
-- é como o app escreve nelas hoje (callService.ts, callRepository.ts).

REVOKE UPDATE ON calls FROM authenticated, anon;

GRANT UPDATE (notes) ON calls TO authenticated;
