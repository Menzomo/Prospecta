-- Controla quais cidades de global_leads ficam visíveis pra usuários comuns em
-- /search e no onboarding (já existe mais de uma cidade importada, mas o beta
-- por enquanto só deve liberar Caxias do Sul). Admin libera mais cidades pelo
-- painel /admin conforme forem sendo importadas — sem RLS de escrita: toda
-- mutação passa pelo client de service role (mesmo padrão de telnyx_numbers).
CREATE TABLE IF NOT EXISTS released_cities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city         text NOT NULL UNIQUE,
  state        text,
  released_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE released_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "released_cities_select_authenticated" ON released_cities;
CREATE POLICY "released_cities_select_authenticated"
  ON released_cities FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO released_cities (city, state)
VALUES ('Caxias do Sul', 'RS')
ON CONFLICT (city) DO NOTHING;
