-- Throttle de tentativas de login por e-mail — mitiga brute-force/credential
-- stuffing contra loginAction, que hoje não tem nenhum rate limit próprio
-- (o rate limit padrão do Supabase Auth é por IP, contornável distribuindo
-- as tentativas entre vários IPs pra atacar uma conta específica).
--
-- Regra: 5 tentativas erradas em 15 minutos → bloqueia por mais 15 minutos.
-- Lógica atômica em SQL (não em JS) pra não abrir corrida entre requisições
-- concorrentes tentando a mesma conta ao mesmo tempo.

CREATE TABLE login_throttle (
  email             text PRIMARY KEY,
  failed_count      integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until      timestamptz
);

-- RLS ligado e sem nenhuma policy: ninguém além do service role lê/escreve
-- aqui — mesmo padrão de "cofre" já usado pras colunas privilegiadas de
-- profiles (20260729010000_profiles_lock_privileged_columns.sql). O acesso
-- é só via as funções SECURITY DEFINER abaixo, chamadas pelo adminSupabase
-- em loginAction.
ALTER TABLE login_throttle ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_login_throttle(p_email text)
RETURNS TABLE(locked boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row login_throttle%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM login_throttle WHERE email = lower(p_email);

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN QUERY SELECT true, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - now())))::integer);
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION record_failed_login(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(p_email);
  v_row login_throttle%ROWTYPE;
  v_max_attempts constant integer := 5;
  v_window_minutes constant integer := 15;
  v_lockout_minutes constant integer := 15;
BEGIN
  SELECT * INTO v_row FROM login_throttle WHERE email = v_email;

  IF NOT FOUND THEN
    INSERT INTO login_throttle (email, failed_count, window_started_at)
    VALUES (v_email, 1, now());
    RETURN;
  END IF;

  -- Janela de 15min expirou desde a primeira tentativa errada — reseta a
  -- contagem em vez de acumular pra sempre.
  IF v_row.window_started_at < now() - (v_window_minutes || ' minutes')::interval THEN
    UPDATE login_throttle
    SET failed_count = 1, window_started_at = now(), locked_until = NULL
    WHERE email = v_email;
    RETURN;
  END IF;

  UPDATE login_throttle
  SET failed_count = failed_count + 1,
      locked_until = CASE
        WHEN failed_count + 1 >= v_max_attempts THEN now() + (v_lockout_minutes || ' minutes')::interval
        ELSE locked_until
      END
  WHERE email = v_email;
END;
$$;

CREATE OR REPLACE FUNCTION clear_login_throttle(p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM login_throttle WHERE email = lower(p_email);
$$;

REVOKE ALL ON FUNCTION check_login_throttle(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_failed_login(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION clear_login_throttle(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION check_login_throttle(text) TO service_role;
GRANT EXECUTE ON FUNCTION record_failed_login(text) TO service_role;
GRANT EXECUTE ON FUNCTION clear_login_throttle(text) TO service_role;
