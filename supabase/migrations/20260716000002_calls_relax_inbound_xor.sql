-- calls_lead_xor exigia exatamente um de lead_id/user_lead_id preenchido, o que
-- quebra o INSERT de uma chamada de entrada cujo número não bate com nenhum lead
-- conhecido (chamada errada, spam, lead ainda não cadastrado) — os dois ficam NULL
-- nesse caso. Outbound continua exigindo exatamente um; inbound aceita nenhum.

ALTER TABLE calls DROP CONSTRAINT calls_lead_xor;

ALTER TABLE calls ADD CONSTRAINT calls_lead_xor CHECK (
  NOT (lead_id IS NOT NULL AND user_lead_id IS NOT NULL)
  AND (direction = 'inbound' OR lead_id IS NOT NULL OR user_lead_id IS NOT NULL)
);
