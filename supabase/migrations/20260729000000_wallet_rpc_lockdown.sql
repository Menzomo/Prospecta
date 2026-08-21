-- CRÍTICO: as RPCs de carteira (SECURITY DEFINER) nunca tiveram REVOKE de PUBLIC.
-- Por padrão, o Postgres libera EXECUTE em função nova pra PUBLIC, e o PostgREST
-- expõe toda função do schema public em /rest/v1/rpc/<nome> pra anon/authenticated.
-- Como essas funções rodam como o dono do banco (ignoram RLS por definição) e
-- recebem p_user_id como parâmetro livre, qualquer usuário logado conseguia
-- chamar credit_wallet/debit_wallet direto pela API do Supabase — sem passar
-- pelo Next.js, sem checagem nenhuma de que p_user_id é ele mesmo — e se
-- creditar saldo à vontade ou zerar o saldo de outro usuário.
--
-- O padrão certo já existia no projeto pra claim_telnyx_number
-- (20260716000000_telnyx_numbers_pool.sql) — só não foi replicado aqui.

-- ── 1. Remove as versões antigas (2 parâmetros) de debit_wallet/credit_wallet ──
-- CREATE OR REPLACE com assinatura diferente cria uma função nova, não substitui
-- a antiga — essas versões de 20260705000000_wallet_balances.sql ficaram
-- instaladas e chamáveis, e não gravam no ledger wallet_transactions.

DROP FUNCTION IF EXISTS debit_wallet(uuid, decimal);
DROP FUNCTION IF EXISTS credit_wallet(uuid, decimal);

-- ── 2. Tranca as RPCs de carteira — só o backend (service_role) pode chamar ────

REVOKE ALL ON FUNCTION debit_wallet(uuid, decimal, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION debit_wallet(uuid, decimal, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION credit_wallet(uuid, decimal, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_wallet(uuid, decimal, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION reserve_wallet(uuid, decimal, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_wallet(uuid, decimal, uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION settle_wallet_hold(uuid, decimal, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION settle_wallet_hold(uuid, decimal, text, text) TO service_role;

REVOKE ALL ON FUNCTION release_wallet_hold(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_wallet_hold(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION expire_wallet_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_wallet_holds() TO service_role;
