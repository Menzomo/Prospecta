-- Histórico de todas as movimentações de saldo
-- Imutável — nunca atualizar ou deletar registros aqui

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text          NOT NULL,
  -- 'call'           → débito de ligação
  -- 'analysis'       → débito de análise de IA
  -- 'leads_purchase' → débito de compra de pacote de leads
  -- 'recharge'       → crédito de recarga (Asaas Pix/cartão)
  -- 'bonus'          → crédito de bônus promocional
  -- 'welcome'        → crédito de boas-vindas (R$10 ao contratar)
  amount        decimal(10,2) NOT NULL,
  -- positivo = crédito · negativo = débito
  balance_after decimal(10,2) NOT NULL,
  reference_id  text,
  -- call_id, call_analysis_id, asaas_payment_id, etc.
  description   text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_type_check CHECK (
    type IN ('call', 'analysis', 'leads_purchase', 'recharge', 'bonus', 'welcome')
  )
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_transactions: usuario le proprias transacoes"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX wallet_transactions_user_created_idx
  ON wallet_transactions (user_id, created_at DESC);
