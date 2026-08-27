-- Conexão de WhatsApp Business por usuário. Nesta fase (MVP), a conexão é
-- feita manualmente por admin via SQL/console — não existe fluxo self-service
-- ainda (depende de confirmar com a Telnyx como funciona a verificação de
-- número quando o número é da plataforma, não do usuário final).

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text        NOT NULL,
  waba_id      text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_settings_phone_number_idx ON whatsapp_settings (phone_number);

ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_settings: owner select" ON whatsapp_settings;
CREATE POLICY "whatsapp_settings: owner select"
  ON whatsapp_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sem policy de insert/update/delete pra authenticated nesta fase — só
-- service_role (admin client) grava, até existir o fluxo self-service.
