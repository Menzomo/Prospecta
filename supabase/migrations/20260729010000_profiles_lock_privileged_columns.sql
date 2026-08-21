-- CRÍTICO: a policy "profiles: update own" (auth.uid() = id) não tem cláusula
-- FOR, então cobre UPDATE em TODAS as colunas — inclusive role (controla acesso
-- ao painel /admin) e subscription_status/subscription_source (controla acesso
-- de escrita ao CRM e ligações). Qualquer usuário autenticado conseguia rodar
-- PATCH /rest/v1/profiles?id=eq.<próprio id> {"role":"admin"} ou
-- {"subscription_status":"active"} direto via REST do Supabase e se promover
-- a admin, ou liberar assinatura sem pagar — sem precisar de nenhum bug no
-- Next.js. Mesma classe de bug já corrigida antes para calls.duration_seconds
-- (20260715000000_calls_lock_billing_columns.sql), mesmo remédio aqui.
--
-- gmail_request_* precisa continuar editável pelo dono (saveGmailRequest,
-- chamado com o client autenticado normal, não o admin). Todas as outras
-- colunas privilegiadas passam a exigir o service role — que já é como o
-- app escreve nelas hoje (updateProfileSubscription sempre usa adminSupabase,
-- e o approveGmailRequest do admin também).

REVOKE UPDATE ON profiles FROM authenticated, anon;

GRANT UPDATE (gmail_request_email, gmail_request_status, gmail_requested_at)
  ON profiles TO authenticated;
