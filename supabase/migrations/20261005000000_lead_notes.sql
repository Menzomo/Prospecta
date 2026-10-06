-- Notas criadas pelo usuário sobre um lead (manual ou de busca).
-- Cada nota é um registro próprio (antes existia só um campo único
-- sobrescrito). A nota antiga (leads.notes / user_leads.notes) continua
-- existindo e é exibida como "nota do cadastro" — não é copiada pra cá.

CREATE TABLE lead_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id      uuid REFERENCES leads(id) ON DELETE CASCADE,
  user_lead_id uuid REFERENCES user_leads(id) ON DELETE CASCADE,
  content      text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- exatamente um dos dois: lead manual OU lead de busca
  CONSTRAINT lead_notes_one_lead_check CHECK ((lead_id IS NULL) <> (user_lead_id IS NULL))
);

CREATE INDEX lead_notes_lead_idx ON lead_notes (lead_id, created_at DESC);
CREATE INDEX lead_notes_user_lead_idx ON lead_notes (user_lead_id, created_at DESC);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_notes: usuario le proprias notas"
  ON lead_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lead_notes: usuario cria proprias notas"
  ON lead_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lead_notes: usuario apaga proprias notas"
  ON lead_notes FOR DELETE USING (auth.uid() = user_id);
