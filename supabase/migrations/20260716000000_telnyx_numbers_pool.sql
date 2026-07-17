-- Pool de números Telnyx dedicados por usuário (ver docs/tasks-v1.md, decisão 2026-07-14:
-- ANATEL bloqueia CallerID compartilhado, cada conta precisa do próprio número).
-- A Prospecta compra números antecipadamente e os deixa disponíveis aqui; o usuário
-- reivindica um na tela de Configurações (claim_telnyx_number abaixo).

CREATE TABLE telnyx_numbers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number      text        NOT NULL UNIQUE,
  telnyx_number_id  text,
  status            text        NOT NULL DEFAULT 'available',
  user_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT telnyx_numbers_status_values CHECK (status IN ('available', 'assigned', 'disabled')),
  CONSTRAINT telnyx_numbers_e164 CHECK (phone_number ~ '^\+[1-9]\d{7,14}$'),
  CONSTRAINT telnyx_numbers_status_user_consistency CHECK (
    (status = 'assigned' AND user_id IS NOT NULL) OR
    (status <> 'assigned' AND user_id IS NULL)
  )
);

-- Garante 1 número por usuário no nível do banco (defesa em profundidade além da RPC abaixo)
CREATE UNIQUE INDEX telnyx_numbers_user_id_idx ON telnyx_numbers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX telnyx_numbers_status_idx ON telnyx_numbers(status) WHERE status = 'available';

ALTER TABLE telnyx_numbers ENABLE ROW LEVEL SECURITY;

-- Dono lê sua própria linha
CREATE POLICY "telnyx_numbers: owner select"
  ON telnyx_numbers FOR SELECT
  USING (auth.uid() = user_id);

-- Qualquer usuário autenticado pode ver números disponíveis (pra montar o seletor)
CREATE POLICY "telnyx_numbers: authenticated can see available pool"
  ON telnyx_numbers FOR SELECT
  TO authenticated
  USING (status = 'available');

-- Nenhuma política de INSERT/UPDATE/DELETE — todas as escritas passam pelo client
-- admin (seed do pool) ou pela RPC claim_telnyx_number (SECURITY DEFINER) abaixo.
REVOKE INSERT, UPDATE, DELETE ON telnyx_numbers FROM authenticated, anon;

-- Reivindicação atômica — mesmo padrão de SELECT ... FOR UPDATE usado em debit_wallet
-- (supabase/migrations/20260709000000_wallet_security_hardening.sql).
CREATE OR REPLACE FUNCTION claim_telnyx_number(
  p_user_id   uuid,
  p_number_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  PERFORM 1 FROM telnyx_numbers WHERE id = p_number_id AND status = 'available' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_not_available';
  END IF;

  IF EXISTS (SELECT 1 FROM telnyx_numbers WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'user_already_has_number';
  END IF;

  UPDATE telnyx_numbers
     SET status = 'assigned', user_id = p_user_id, assigned_at = now(), updated_at = now()
   WHERE id = p_number_id AND status = 'available'
  RETURNING phone_number INTO v_phone;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'number_not_available';
  END IF;

  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION claim_telnyx_number(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_telnyx_number(uuid, uuid) TO service_role;
