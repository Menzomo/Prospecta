-- Wallet security hardening
-- 1. Precisão decimal(10,2) → decimal(10,4) para faturamento por segundo
-- 2. Índice parcial de idempotência em wallet_transactions
-- 3. Regras de imutabilidade (sem DELETE/UPDATE em transações)
-- 4. Tabela wallet_holds para reservas pré-ligação
-- 5. Novos tipos de transação (hold, hold_refund)
-- 6. debit_wallet reescrito com SELECT FOR UPDATE + ledger write + ON CONFLICT
-- 7. credit_wallet agora também grava no ledger
-- 8. Novas RPCs: reserve_wallet, settle_wallet_hold, release_wallet_hold, expire_wallet_holds

-- ── 1. Precisão de colunas decimais ──────────────────────────────────────────

ALTER TABLE wallet_transactions
  ALTER COLUMN amount        SET DATA TYPE decimal(10,4),
  ALTER COLUMN balance_after SET DATA TYPE decimal(10,4);

ALTER TABLE wallet_balances
  ALTER COLUMN balance SET DATA TYPE decimal(10,4);

-- ── 2. Novos tipos de transação ───────────────────────────────────────────────
-- 'hold'        → débito de reserva pré-ligação
-- 'hold_refund' → crédito de estorno parcial ou total de reserva

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check CHECK (
    type IN ('call', 'analysis', 'leads_purchase', 'recharge', 'bonus', 'welcome',
             'hold', 'hold_refund')
  );

-- ── 3. Índice parcial de idempotência ────────────────────────────────────────
-- Impede que o mesmo webhook/evento debite/credite duas vezes.
-- NULL reference_id está isento (créditos manuais/admin).

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_idempotency_idx
  ON wallet_transactions (user_id, reference_id, type)
  WHERE reference_id IS NOT NULL;

-- ── 4. Imutabilidade do ledger ────────────────────────────────────────────────
-- Regras de banco bloqueiam DELETE e UPDATE mesmo para service role.

CREATE RULE no_delete_wallet_tx AS
  ON DELETE TO wallet_transactions DO INSTEAD NOTHING;

CREATE RULE no_update_wallet_tx AS
  ON UPDATE TO wallet_transactions DO INSTEAD NOTHING;

-- ── 5. Tabela de reservas (holds) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_holds (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      decimal(10,4) NOT NULL CHECK (amount > 0),
  call_id     uuid,
  -- 'active'   → reserva em aberto (ligação em andamento)
  -- 'settled'  → liquidado via webhook com cobrança real
  -- 'released' → estornado manualmente (ligação não conectou)
  -- 'expired'  → expirado pelo cron de reconciliação (webhook não chegou)
  status      text          NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'settled', 'released', 'expired')),
  expires_at  timestamptz   NOT NULL DEFAULT now() + interval '2 hours',
  created_at  timestamptz   NOT NULL DEFAULT now(),
  settled_at  timestamptz,
  released_at timestamptz
);

ALTER TABLE wallet_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_holds: usuario le proprios holds"
  ON wallet_holds FOR SELECT
  USING (auth.uid() = user_id);

-- Índice para busca rápida de holds ativos por usuário
CREATE INDEX wallet_holds_user_active_idx
  ON wallet_holds (user_id)
  WHERE status = 'active';

-- Índice para o cron de expiração varrer apenas holds ativos vencidos
CREATE INDEX wallet_holds_expires_active_idx
  ON wallet_holds (expires_at)
  WHERE status = 'active';

-- ── 6. debit_wallet — reescrito com SELECT FOR UPDATE + ledger ───────────────
-- Assinatura estendida; parâmetros novos têm default para retrocompatibilidade.

CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id      uuid,
  p_amount       decimal,
  p_type         text    DEFAULT 'call',
  p_reference_id text    DEFAULT NULL,
  p_description  text    DEFAULT NULL
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance     decimal;
  v_new_balance decimal;
  v_tx_id       uuid;
BEGIN
  -- Lock da linha de saldo — impede race condition com outra sessão concurrent
  SELECT balance INTO v_balance
    FROM wallet_balances
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  v_new_balance := v_balance - p_amount;

  -- Ledger write idempotente — ON CONFLICT faz nada se reference_id já existe
  INSERT INTO wallet_transactions
    (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, p_type, -p_amount, v_new_balance, p_reference_id, p_description)
  ON CONFLICT (user_id, reference_id, type) WHERE reference_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_tx_id;

  -- Se houve conflito (requisição duplicada), retorna o balance_after já registrado
  IF v_tx_id IS NULL THEN
    SELECT balance_after INTO v_new_balance
      FROM wallet_transactions
     WHERE user_id      = p_user_id
       AND reference_id = p_reference_id
       AND type         = p_type
     LIMIT 1;
    RETURN v_new_balance;
  END IF;

  -- Atualiza cache de saldo (o ledger é a fonte de verdade; isto é o cache)
  UPDATE wallet_balances
     SET balance    = v_new_balance,
         updated_at = now()
   WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;

-- ── 7. credit_wallet — agora também grava no ledger ──────────────────────────

CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id      uuid,
  p_amount       decimal,
  p_type         text    DEFAULT 'recharge',
  p_reference_id text    DEFAULT NULL,
  p_description  text    DEFAULT NULL
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance decimal;
BEGIN
  -- Upsert no cache de saldo
  INSERT INTO wallet_balances (user_id, balance)
    VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
    DO UPDATE
       SET balance    = wallet_balances.balance + EXCLUDED.balance,
           updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Grava no ledger (idempotente se reference_id não nulo)
  INSERT INTO wallet_transactions
    (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, p_type, p_amount, v_new_balance, p_reference_id, p_description)
  ON CONFLICT (user_id, reference_id, type) WHERE reference_id IS NOT NULL
    DO NOTHING;

  RETURN v_new_balance;
END;
$$;

-- ── 8. reserve_wallet — reserva pessimista pré-ligação ────────────────────────
-- Debita imediatamente do saldo e cria um hold ativo.
-- Se o webhook nunca chegar, expire_wallet_holds() estorna o valor.

CREATE OR REPLACE FUNCTION reserve_wallet(
  p_user_id     uuid,
  p_amount      decimal,
  p_call_id     uuid    DEFAULT NULL,
  p_reference_id text   DEFAULT NULL,
  p_description  text   DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance     decimal;
  v_new_balance decimal;
  v_hold_id     uuid;
BEGIN
  -- Lock de saldo
  SELECT balance INTO v_balance
    FROM wallet_balances
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  v_new_balance := v_balance - p_amount;

  -- Cria o hold
  INSERT INTO wallet_holds (user_id, amount, call_id)
    VALUES (p_user_id, p_amount, p_call_id)
  RETURNING id INTO v_hold_id;

  -- Grava no ledger como 'hold'
  INSERT INTO wallet_transactions
    (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'hold', -p_amount, v_new_balance,
     COALESCE(p_reference_id, 'hold:' || v_hold_id::text),
     COALESCE(p_description, 'Reserva pré-ligação'));

  -- Atualiza cache de saldo
  UPDATE wallet_balances
     SET balance    = v_new_balance,
         updated_at = now()
   WHERE user_id = p_user_id;

  RETURN v_hold_id;
END;
$$;

-- ── 9. settle_wallet_hold — liquida hold com duração real do webhook ──────────
-- Deve ser chamado no status callback do Twilio com CallDuration.
-- Se custo real < reserva → estorna a diferença.
-- Se custo real >= reserva → não há cobrança adicional (já debitado).

CREATE OR REPLACE FUNCTION settle_wallet_hold(
  p_hold_id       uuid,
  p_actual_amount decimal,
  p_reference_id  text    DEFAULT NULL,
  p_description   text    DEFAULT NULL
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold        wallet_holds%ROWTYPE;
  v_balance     decimal;
  v_new_balance decimal;
  v_refund      decimal;
BEGIN
  -- Lock do hold
  SELECT * INTO v_hold
    FROM wallet_holds
   WHERE id = p_hold_id
     AND status = 'active'
   FOR UPDATE;

  IF v_hold.id IS NULL THEN
    RAISE EXCEPTION 'hold_not_found_or_inactive';
  END IF;

  -- Lock de saldo
  SELECT balance INTO v_balance
    FROM wallet_balances
   WHERE user_id = v_hold.user_id
   FOR UPDATE;

  v_new_balance := v_balance;

  -- Se custo real < reserva: estorna a diferença
  IF p_actual_amount < v_hold.amount THEN
    v_refund      := v_hold.amount - p_actual_amount;
    v_new_balance := v_balance + v_refund;

    UPDATE wallet_balances
       SET balance    = v_new_balance,
           updated_at = now()
     WHERE user_id = v_hold.user_id;

    -- Ledger: crédito de ajuste
    INSERT INTO wallet_transactions
      (user_id, type, amount, balance_after, reference_id, description)
    VALUES
      (v_hold.user_id, 'hold_refund', v_refund, v_new_balance,
       p_reference_id,
       COALESCE(p_description, 'Ajuste pós-ligação (custo real < reserva)'));
  END IF;
  -- Se custo real >= reserva: o débito já foi feito na reserva; sem ação extra.

  -- Atualiza hold para settled
  UPDATE wallet_holds
     SET status     = 'settled',
         settled_at = now()
   WHERE id = p_hold_id;

  RETURN v_new_balance;
END;
$$;

-- ── 10. release_wallet_hold — estorno total (ligação não conectou) ─────────────

CREATE OR REPLACE FUNCTION release_wallet_hold(
  p_hold_id      uuid,
  p_reference_id text DEFAULT NULL,
  p_description  text DEFAULT NULL
) RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold        wallet_holds%ROWTYPE;
  v_new_balance decimal;
BEGIN
  SELECT * INTO v_hold
    FROM wallet_holds
   WHERE id = p_hold_id
     AND status = 'active'
   FOR UPDATE;

  IF v_hold.id IS NULL THEN
    RAISE EXCEPTION 'hold_not_found_or_inactive';
  END IF;

  -- Estorna valor ao saldo
  UPDATE wallet_balances
     SET balance    = balance + v_hold.amount,
         updated_at = now()
   WHERE user_id = v_hold.user_id
  RETURNING balance INTO v_new_balance;

  -- Ledger: crédito de estorno
  INSERT INTO wallet_transactions
    (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (v_hold.user_id, 'hold_refund', v_hold.amount, v_new_balance,
     p_reference_id,
     COALESCE(p_description, 'Estorno de reserva — ligação não realizada'));

  -- Marca hold como liberado
  UPDATE wallet_holds
     SET status      = 'released',
         released_at = now()
   WHERE id = p_hold_id;

  RETURN v_new_balance;
END;
$$;

-- ── 11. expire_wallet_holds — reconciliação (alvo do cron) ───────────────────
-- Retorna a contagem de holds expirados processados.
-- Chamar via cron a cada hora: SELECT expire_wallet_holds();

CREATE OR REPLACE FUNCTION expire_wallet_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold        wallet_holds%ROWTYPE;
  v_new_balance decimal;
  v_count       integer := 0;
BEGIN
  FOR v_hold IN
    SELECT * FROM wallet_holds
     WHERE status     = 'active'
       AND expires_at < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    -- Estorna ao saldo
    UPDATE wallet_balances
       SET balance    = balance + v_hold.amount,
           updated_at = now()
     WHERE user_id = v_hold.user_id
    RETURNING balance INTO v_new_balance;

    -- Ledger
    INSERT INTO wallet_transactions
      (user_id, type, amount, balance_after, description)
    VALUES
      (v_hold.user_id, 'hold_refund', v_hold.amount, v_new_balance,
       'Estorno automático — reserva expirada (webhook não recebido em 2h)');

    -- Marca como expirado
    UPDATE wallet_holds
       SET status      = 'expired',
           released_at = now()
     WHERE id = v_hold.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
