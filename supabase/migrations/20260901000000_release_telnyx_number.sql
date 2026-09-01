-- Mirror de claim_telnyx_number (20260716000000_telnyx_numbers_pool.sql) —
-- devolve o número do usuário pro pool. Usada no "encerrar conta"
-- self-service e substitui o UPDATE solto que releaseTelnyxNumberAction
-- (admin) faz hoje, que não é atômico nem reutilizável fora dali.
--
-- Uma única UPDATE já é atômica — diferente da claim, não precisa de
-- FOR UPDATE (não tem disputa entre usuários diferentes pela mesma linha,
-- só o dono da linha mexe nela).

CREATE OR REPLACE FUNCTION release_telnyx_number(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE telnyx_numbers
  SET status = 'available', user_id = NULL, assigned_at = NULL
  WHERE user_id = p_user_id AND status = 'assigned';
END;
$$;

REVOKE ALL ON FUNCTION release_telnyx_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_telnyx_number(uuid) TO service_role;
