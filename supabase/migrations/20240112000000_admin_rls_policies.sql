-- ============================================================
-- Admin RLS policies
-- ============================================================
-- Adiciona acesso de leitura para admins além do acesso padrão por usuário.
-- Usa OR logic do PostgreSQL: múltiplas políticas permissivas são unidas com OR.
-- ============================================================

-- Admins podem ver todos os profiles (padrão: cada usuário vê só o seu)
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Admins podem ver global_leads de qualquer status (padrão: só status=active)
drop policy if exists "global_leads_select_admin" on public.global_leads;
create policy "global_leads_select_admin"
  on public.global_leads for select
  to authenticated
  using (public.is_admin());
