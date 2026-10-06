-- Data da primeira ativação da assinatura (Asaas ou liberação manual do admin).
-- subscription_paid_at continua sendo o último pagamento.
ALTER TABLE profiles ADD COLUMN subscribed_at timestamptz;

-- Backfill: contas ativas hoje. Asaas usa o último pagamento; manual usa a última atualização.
UPDATE profiles
   SET subscribed_at = COALESCE(subscription_paid_at, updated_at)
 WHERE subscription_status = 'active' AND subscribed_at IS NULL;
