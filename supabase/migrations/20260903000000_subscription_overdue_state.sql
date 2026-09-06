-- Suporte a carência de inadimplência (7 dias vencido → desativa, +7 dias →
-- encerra) e cartão de crédito recorrente na assinatura.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_overdue_since timestamptz,
  ADD COLUMN IF NOT EXISTS asaas_has_card boolean NOT NULL DEFAULT false;

-- 'overdue' é um estado novo — diferente de 'inactive' (nunca assinou, pode
-- logar normal) e de 'canceled' (encerrado, login bloqueado): desativado por
-- falta de pagamento, ainda pode logar pra regularizar, só fica sem canWrite.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_values;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_values
  CHECK (subscription_status IN ('inactive', 'active', 'overdue', 'canceled'));
