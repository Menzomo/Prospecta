-- Função atômica para deduzir 1 crédito de análise do período atual.
-- Retorna TRUE se deduziu com sucesso, FALSE se não há créditos disponíveis.
-- Usa UPDATE ... WHERE credits_used < credits_total para garantir atomicidade.

CREATE OR REPLACE FUNCTION deduct_analysis_credit(p_user_id uuid, p_now timestamptz)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  UPDATE analysis_credits
  SET credits_used = credits_used + 1
  WHERE user_id = p_user_id
    AND period_start <= p_now
    AND period_end   >= p_now
    AND credits_used < credits_total;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated > 0;
END;
$$;
