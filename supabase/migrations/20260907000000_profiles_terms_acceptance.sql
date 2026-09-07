-- Auditoria do aceite dos Termos de Serviço no fluxo de assinatura
-- (subscribeAction / TERMS_VERSION em src/features/settings/termsContent.ts).
-- Guarda quando e qual versão do texto o cliente aceitou, pra ter rastro caso
-- o conteúdo mude no futuro. Escrito sempre via service role (adminSupabase),
-- igual às outras colunas de assinatura — a policy de UPDATE de profiles
-- (20260729010000_profiles_lock_privileged_columns.sql) já restringe UPDATE
-- direto do usuário autenticado às colunas gmail_request_*, então essas duas
-- colunas novas já nascem bloqueadas pro cliente escrever sozinho.

ALTER TABLE profiles
  ADD COLUMN terms_accepted_at timestamptz,
  ADD COLUMN terms_version     text;
