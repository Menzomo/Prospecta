-- Feature Visitas: cálculo de rota otimizada é cobrado da carteira (mesmo
-- esquema de ligação/análise de IA). Adiciona 'route' aos tipos permitidos.

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check CHECK (
    type IN ('call', 'analysis', 'leads_purchase', 'recharge', 'bonus', 'welcome',
             'hold', 'hold_refund', 'route')
  );
