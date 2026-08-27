-- Mensagens de WhatsApp trocadas com leads. Diferente de lead_visits/followups,
-- lead_id e user_lead_id NÃO têm CHECK exigindo pelo menos um preenchido —
-- mensagem recebida de um número que não bate com nenhum lead é um caso
-- esperado (fica sem vínculo, mas ainda visível/rastreável por from_number).

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id              uuid        REFERENCES leads(id) ON DELETE CASCADE,
  user_lead_id         uuid        REFERENCES user_leads(id) ON DELETE CASCADE,
  direction            text        NOT NULL,
  from_number          text        NOT NULL,
  to_number            text        NOT NULL,
  body                 text        NOT NULL,
  status               text        NOT NULL DEFAULT 'queued',
  provider_message_id  text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_direction_values
    CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT whatsapp_messages_status_values
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed'))
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_user_id_idx ON whatsapp_messages (user_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_id_idx ON whatsapp_messages (lead_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_user_lead_id_idx ON whatsapp_messages (user_lead_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_provider_message_id_idx ON whatsapp_messages (provider_message_id);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages: owner select" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages: owner select"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_messages: owner insert" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages: owner insert"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_messages: owner update" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages: owner update"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
