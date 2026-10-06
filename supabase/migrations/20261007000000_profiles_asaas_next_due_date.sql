-- Próximo vencimento da assinatura, lido do Asaas (subscription.nextDueDate).
-- O Asaas é a fonte da verdade: não calculamos essa data localmente.
ALTER TABLE profiles ADD COLUMN asaas_next_due_date date;
