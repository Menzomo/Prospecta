-- supabase_auth_admin é papel reservado — não dá pra usar ALTER ROLE ... BYPASSRLS
-- nele em projetos gerenciados. Alternativa: política de RLS liberando esse papel
-- especificamente, só nas tabelas que bloqueiam a exclusão em cascata de auth.users
-- (erro "referential integrity query ... gave unexpected result" ao deletar usuário
-- via Dashboard/Auth Admin API, causado por RLS sem exceção pra esse papel interno).

CREATE POLICY "supabase_auth_admin: bypass para cascade delete"
  ON wallet_balances
  FOR ALL
  TO supabase_auth_admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "supabase_auth_admin: bypass para cascade delete"
  ON wallet_transactions
  FOR ALL
  TO supabase_auth_admin
  USING (true)
  WITH CHECK (true);
