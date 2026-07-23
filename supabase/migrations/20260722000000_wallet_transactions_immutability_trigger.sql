-- BUG CRÍTICO: as RULES criadas em 20260709000000_wallet_security_hardening.sql
-- pra tornar wallet_transactions imutável (bloquear DELETE/UPDATE) são
-- incompatíveis com INSERT ... ON CONFLICT — Postgres recusa a combinação:
-- "INSERT with ON CONFLICT clause cannot be used with table that has INSERT
-- or UPDATE rules". credit_wallet e debit_wallet usam ON CONFLICT pra
-- idempotência (reference_id), então toda recarga Pix real e todo débito de
-- ligação/análise vinham falhando silenciosamente com esse erro.
--
-- Fix: troca as RULES por TRIGGERS equivalentes (mesmo comportamento —
-- silenciosamente ignora DELETE/UPDATE no ledger), que não têm essa restrição.

DROP RULE IF EXISTS no_delete_wallet_tx ON wallet_transactions;
DROP RULE IF EXISTS no_update_wallet_tx ON wallet_transactions;

CREATE OR REPLACE FUNCTION wallet_transactions_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NULL; -- ledger imutável: silenciosamente ignora DELETE/UPDATE
END;
$$;

DROP TRIGGER IF EXISTS wallet_transactions_no_delete ON wallet_transactions;
CREATE TRIGGER wallet_transactions_no_delete
  BEFORE DELETE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION wallet_transactions_block_mutation();

DROP TRIGGER IF EXISTS wallet_transactions_no_update ON wallet_transactions;
CREATE TRIGGER wallet_transactions_no_update
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION wallet_transactions_block_mutation();
