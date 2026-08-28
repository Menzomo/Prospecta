-- Limita a 2 sessões simultâneas por usuário (cobre uso normal de
-- desktop + celular). Ao logar num 3º lugar, a(s) sessão(ões) mais antiga(s)
-- é(são) derrubada(s) automaticamente — evita uma assinatura sendo
-- compartilhada por vários usuários ao mesmo tempo.
--
-- Schema de auth.sessions/auth.refresh_tokens confirmado ao vivo antes de
-- escrever esta função (colunas id/user_id/created_at em sessions,
-- session_id em refresh_tokens).
--
-- Não é instantâneo: o dispositivo expulso continua com o token de acesso
-- atual válido até expirar naturalmente (~1h, padrão do Supabase) — só na
-- próxima tentativa de renovar é que percebe que a sessão sumiu.

CREATE OR REPLACE FUNCTION enforce_session_limit(p_user_id uuid, p_max_sessions int DEFAULT 2)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_session_ids uuid[];
BEGIN
  -- Mantém só as p_max_sessions mais recentes (por created_at); o resto
  -- vira "sessão antiga" e é derrubado. A sessão recém-criada no login atual
  -- já está em auth.sessions nesse momento, então ela sempre sobrevive (é a
  -- mais recente).
  SELECT array_agg(id) INTO v_old_session_ids
  FROM (
    SELECT id FROM auth.sessions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET p_max_sessions
  ) old_sessions;

  IF v_old_session_ids IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens WHERE session_id = ANY(v_old_session_ids);
    DELETE FROM auth.sessions WHERE id = ANY(v_old_session_ids);
  END IF;
END;
$$;

-- Mesma lição já aprendida com as RPCs de carteira: Postgres libera EXECUTE
-- pra PUBLIC por padrão, e o PostgREST expõe toda função do schema public
-- como /rest/v1/rpc/<nome> pra anon/authenticated automaticamente. Trava
-- pra só service_role poder chamar.
REVOKE ALL ON FUNCTION enforce_session_limit(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION enforce_session_limit(uuid, int) TO service_role;
