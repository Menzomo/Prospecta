-- Feature Visitas: agendamento de visita presencial a um lead, agrupado por
-- dia, com ordem otimizada de rota calculada via OpenRouteService.
-- Mesmo padrão de lead_id/user_lead_id opcionais já usado em followups
-- (20260618000000_followups_user_lead_id.sql) — visita pode ser de um lead
-- manual ou de um lead vindo da busca.

CREATE TABLE IF NOT EXISTS lead_visits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id        uuid        REFERENCES leads(id) ON DELETE CASCADE,
  user_lead_id   uuid        REFERENCES user_leads(id) ON DELETE CASCADE,
  scheduled_date date        NOT NULL,
  status         text        NOT NULL DEFAULT 'planejada',
  visit_order    integer,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_visits_lead_or_user_lead_check
    CHECK (lead_id IS NOT NULL OR user_lead_id IS NOT NULL),
  CONSTRAINT lead_visits_status_values
    CHECK (status IN ('planejada', 'concluida', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS lead_visits_user_id_idx ON lead_visits (user_id);
CREATE INDEX IF NOT EXISTS lead_visits_lead_id_idx ON lead_visits (lead_id);
CREATE INDEX IF NOT EXISTS lead_visits_user_lead_id_idx ON lead_visits (user_lead_id);
CREATE INDEX IF NOT EXISTS lead_visits_scheduled_date_idx ON lead_visits (user_id, scheduled_date);

ALTER TABLE lead_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_visits: owner select" ON lead_visits;
CREATE POLICY "lead_visits: owner select"
  ON lead_visits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_visits: owner insert" ON lead_visits;
CREATE POLICY "lead_visits: owner insert"
  ON lead_visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_visits: owner update" ON lead_visits;
CREATE POLICY "lead_visits: owner update"
  ON lead_visits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_visits: owner delete" ON lead_visits;
CREATE POLICY "lead_visits: owner delete"
  ON lead_visits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
