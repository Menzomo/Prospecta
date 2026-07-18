-- Campos de assinatura (Fase 8 — integração Asaas, ver docs/tasks-v1.md).
-- subscription_status governa acesso ao módulo de ligações (token/route.ts).

ALTER TABLE profiles
  ADD COLUMN subscription_status   text NOT NULL DEFAULT 'inactive',
  ADD COLUMN subscription_source   text,              -- 'asaas' | 'manual' | 'beta_grandfather'
  ADD COLUMN asaas_customer_id     text,
  ADD COLUMN asaas_subscription_id text,
  ADD COLUMN subscription_paid_at  timestamptz;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_values
    CHECK (subscription_status IN ('inactive', 'active', 'canceled'));

-- Grandfather: contas que já existem hoje mantêm acesso liberado — o bloqueio
-- por assinatura só passa a valer pra contas criadas a partir de agora
-- (DEFAULT 'inactive' acima cobre isso automaticamente pra novas linhas).
UPDATE profiles SET subscription_status = 'active', subscription_source = 'beta_grandfather';
