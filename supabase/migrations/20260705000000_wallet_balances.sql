-- Tabela de saldo do usuário (wallet)
-- Uma linha por usuário — saldo em reais, nunca negativo

CREATE TABLE IF NOT EXISTS wallet_balances (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    decimal(10,2) NOT NULL DEFAULT 0.00,
  updated_at timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT wallet_balances_user_unique UNIQUE (user_id),
  CONSTRAINT wallet_balances_non_negative CHECK (balance >= 0)
);

ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- Usuário só lê o próprio saldo
CREATE POLICY "wallet_balances: usuario le proprio saldo"
  ON wallet_balances FOR SELECT
  USING (auth.uid() = user_id);

-- ── RPCs SECURITY DEFINER ────────────────────────────────────────────────────
-- Chamadas exclusivamente pelo backend com admin client.
-- NUNCA expor ao frontend diretamente.

-- Débito atômico — lança exceção se saldo insuficiente
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id uuid,
  p_amount  decimal
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance decimal;
BEGIN
  UPDATE wallet_balances
     SET balance    = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Crédito — cria registro se não existir (upsert)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id uuid,
  p_amount  decimal
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance decimal;
BEGIN
  INSERT INTO wallet_balances (user_id, balance)
    VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
    DO UPDATE
       SET balance    = wallet_balances.balance + EXCLUDED.balance,
           updated_at = now()
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
