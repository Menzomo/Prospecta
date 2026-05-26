-- ============================================================
-- Fase 2: Abrir INSERT em global_leads para usuários autenticados
-- ============================================================
-- A busca de leads roda com a session do usuário (anon key + JWT).
-- Não existe um service role client configurado no projeto ainda.
-- Para que o searchService consiga gravar no banco global,
-- a política de INSERT precisa permitir qualquer autenticado.
--
-- Débito técnico: migrar para service role key quando
-- admin tooling for implementado.
-- ============================================================

drop policy if exists "global_leads_insert_admin" on public.global_leads;

create policy "global_leads_insert_auth"
  on public.global_leads for insert
  to authenticated
  with check (true);
