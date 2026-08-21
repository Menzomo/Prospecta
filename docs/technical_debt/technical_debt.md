# Débitos Técnicos — Prospecta

Última atualização: 29 Jul 2026

---

## SEGURANÇA — achados da auditoria completa de 29 Jul 2026

Auditoria cobriu login/recuperação de senha, IDOR/RLS, webhooks, admin, segredos e XSS/injeção. Os 3 achados críticos (RPCs de carteira chamáveis por qualquer usuário via PostgREST, header de assinatura Ed25519 da Telnyx com nome errado, colunas privilegiadas de `profiles` editáveis pelo dono) já foram corrigidos no mesmo dia — ver commits `fea351c`, `4033c95`, `e513671`. O que segue é o que ficou pendente, por severidade.

### Alto

**DT-SEC-H1 — Cobrança de ligação confia num header controlável pelo navegador**

**Problema:** `extractUserIdUnsafe` (`src/services/callService.ts`) resolve o dono da chamada a partir do SIP header `X-ProspectaUserId`, que o próprio navegador envia (`usePhoneCall.ts`). A assinatura do webhook (mesmo depois de corrigida) só prova que a Telnyx repassou a requisição — não que o conteúdo do header é verdadeiro.

**Ataque:** um usuário autenticado edita esse header (via DevTools ou script) pra conter o UUID de outro usuário. A ligação é criada, gravada e **cobrada na carteira da vítima**, usando o número dela como CallerID.

**Localização:** `src/services/callService.ts` (`extractUserIdUnsafe`, `handleOutboundCallWebhook`), `src/features/calls/hooks/usePhoneCall.ts`.

**Solução esperada:** não confiar no header pra identidade. Vincular a ligação a um token/registro criado no servidor em `POST /api/calls/token` (já autenticado via sessão), e validar no webhook que o header bate com esse registro.

---

**DT-SEC-H2 — `/api/calls/hangup` sem autenticação nenhuma**

**Problema:** a rota recebe `callId` no corpo, busca a chamada via client admin (ignora RLS) e manda comando de desligar pra API da Telnyx — sem `auth.getUser()`, sem checar `user_id`. Está dentro do prefixo `/api/calls/` que o middleware isenta de sessão.

**Ataque:** qualquer pessoa na internet, sem login, derruba a ligação de qualquer usuário só sabendo o `callId`.

**Localização:** `src/app/api/calls/hangup/route.ts`.

**Solução esperada:** adicionar `auth.getUser()` + filtrar a busca da chamada por `.eq('user_id', user.id)` usando o client autenticado (não o admin).

### Médio

**DT-SEC-M1 — `credit_wallet` não é idempotente**

O saldo em cache (`wallet_balances`) é incrementado *antes* da checagem de duplicidade no ledger (`wallet_transactions`), diferente de `debit_wallet` (que faz certo — grava o ledger primeiro e aborta em conflito). Reenvio de webhook do Asaas credita saldo real duas vezes, mesmo o extrato mostrando só uma vez. **Localização:** função `credit_wallet` em `supabase/migrations/20260709000000_wallet_security_hardening.sql`. **Solução:** espelhar a ordem de `debit_wallet`.

**DT-SEC-M2 — `deduct_analysis_credit` tem o mesmo padrão de RPC sem `REVOKE` que os wallet functions tinham**

`SECURITY DEFINER`, recebe `p_user_id` livre, sem `REVOKE ... FROM PUBLIC`. Um usuário consegue esgotar os créditos de análise de outro chamando a RPC direto. **Localização:** `supabase/migrations/20260625000000_calls_deduct_credit_fn.sql`. **Solução:** mesmo remédio já aplicado às funções de carteira (`REVOKE ALL FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role`), mais `SET search_path = public` (falta nessa função).

**DT-SEC-M3 — `/api/asaas/webhook` e `/api/admin/enrich-lead` provavelmente nunca executam**

Nenhuma das duas rotas está em `PUBLIC_PATHS` nem `BYPASS_PREFIXES` do `middleware.ts` — como a requisição do Asaas/n8n não tem cookie de sessão, o middleware redireciona pra `/login` antes do handler rodar. Não é falha de segurança (falha fechada), mas pode significar que **assinaturas via Pix nunca ativam sozinhas** e enriquecimento de leads via n8n nunca roda. **Localização:** `middleware.ts`. **Solução:** adicionar os dois paths exatos em `PUBLIC_PATHS` (não o prefixo `/api/` inteiro).

**DT-SEC-M4 — `global_leads` aceita INSERT de qualquer usuário autenticado**

Policy `global_leads_insert_auth` (`with check (true)`) documentada como dívida técnica desde a criação, "migrar pra service role quando existir ferramental de admin" — esse ferramental já existe. Permite poluir a base compartilhada de leads. **Localização:** `supabase/migrations/20240110000000_update_global_leads_rls.sql`. **Solução:** derrubar a policy; imports já passam pelo client admin.

**DT-SEC-M5 — Injeção de filtro no autocomplete de cidade**

`.or(\`name.ilike.%${query}%,search_text.ilike.%${normalized}%\`)` em `src/repositories/cityRepository.ts` interpola a busca do usuário direto numa expressão crua do PostgREST — vírgulas/parênteses no input quebram o filtro pretendido. Impacto baixo (autenticado, tabela não sensível), mas é injeção real. **Solução:** sanitizar `,().:` do input, ou separar em duas queries e mesclar em JS.

**DT-SEC-M6 — Link de redefinição de senha usa o header `Host` da requisição**

`getRequestOrigin()` (`src/features/auth/actions.ts`) monta a URL de redirect do reset de senha a partir do header `Host` em vez de `NEXT_PUBLIC_APP_URL` (usado em todo o resto do app). Se a allowlist de Redirect URLs do Supabase tiver wildcard, um `Host` forjado pode desviar o link de recuperação pra outro domínio. **Solução:** trocar por `NEXT_PUBLIC_APP_URL`; conferir a allowlist no painel do Supabase.

**DT-SEC-M7 — Sem rate limit em login/cadastro/esqueci-senha**

Nenhum limitador próprio (só os limites padrão por IP do GoTrue). Facilita força bruta de senha (agravado pela política de senha fraca, ver DT-SEC-L4) e permite usar o forgot-password como amplificador de email pra endereços arbitrários.

**DT-SEC-M8 — Cadastro não confirma que a sessão veio com email verificado**

`signUp` redireciona direto pra `/onboarding` sem checar `data.session`/`email_confirmed_at`. Depende de "Confirm email" estar ativado no painel do Supabase (não verificável pelo código) — se estiver desligado, abre caminho pra pré-sequestro de conta via cadastro com email de outra pessoa + login Google depois. **Solução:** confirmar a config no painel, e adicionar checagem defensiva `if (!data.session) return {...}` antes do redirect.

### Baixo

- **DT-SEC-L1** — `call_analyses` tem policy `FOR ALL` sem restrição de coluna — dono da linha pode escrever `credits_used` e outros campos que deveriam ser só do sistema. Mesma classe de bug já corrigida pra `calls`/`profiles`; falta aplicar o mesmo `REVOKE`/`GRANT` de colunas aqui.
- **DT-SEC-L2** — `/reset-password` não confere se a sessão veio de um link de recuperação (nem pede senha atual), e não desloga as outras sessões depois de trocar a senha.
- **DT-SEC-L3** — Cookie de sessão sem a flag `Secure` explícita (herda o padrão da lib `@supabase/ssr`).
- **DT-SEC-L4** — Senha mínima de 6 caracteres, sem exigência de complexidade (`src/validations/authSchema.ts`).
- **DT-SEC-L5** — Sem headers de segurança (CSP, HSTS, X-Frame-Options) — `next.config.ts` não define nenhum.
- **DT-SEC-L6** — Cadastro devolve mensagem de erro crua do Supabase (`error.message`), permitindo descobrir se um email já tem conta — login já normaliza pra mensagem genérica, cadastro não.
- **DT-SEC-L7** — Redirect aberto tipo `//evil.com` em `src/app/auth/callback/page.tsx` (`next?.startsWith('/')` deixa passar `//`).
- **DT-SEC-L8** — Injeção de cabeçalho de email via assunto de template não sanitizado (`\r\n`) em `src/services/emailSendService.ts`.
- **DT-SEC-L9** — Validação de assinatura Telnyx totalmente desligada quando `NODE_ENV === 'development'` — trocar por uma flag explícita tipo `ALLOW_UNSIGNED_WEBHOOKS`, já que qualquer ambiente de preview/staging que suba com `NODE_ENV` errado fica sem proteção nenhuma.
- **DT-SEC-L10** — `notifyBetaAction` (`src/app/auth/callback/actions.ts`) é uma Server Action sem checagem de sessão que aceita `userId` arbitrário — impacto baixo (exige adivinhar um UUID v4), mas devia derivar o ID da sessão, não do argumento.
- **DT-SEC-L11** — Dois modelos de "admin" que não se conversam: `ADMIN_USER_IDS` (isenção de cobrança) e `profiles.role==='admin'` (acesso ao painel) — risco de um usuário ser admin num sentido e não no outro sem perceber. Considerar unificar ou documentar melhor a distinção.

---

## HIGH — Impacto direto em segurança, dados ou experiência principal

### DT-H5 — Limite de leads não considera status de assinatura

**Problema:** O fluxo de busca de leads aplica o limite mensal de 200 leads a qualquer usuário autenticado, independente de ter ou não uma assinatura ativa. Não há distinção entre usuário free (sem plano) e usuário assinante. Os 20 leads de teste gratuitos (pré-assinatura) nunca foram implementados.

**Comportamento atual:** `isAdmin → ilimitado`, qualquer outro usuário → 200 leads/mês direto, sem checar plano.

**Comportamento esperado:**
- Usuário sem assinatura → limite de 20 leads totais (teste gratuito)
- Usuário com assinatura ativa → limite mensal de 200 leads

**Dependência:** Requer implementação completa do fluxo de pagamentos (Stripe ou equivalente) e tabela/lógica de `user_subscriptions` antes de ser resolvido.

**Localização:** `src/app/api/search/leads/route.ts`, `src/app/api/user-leads/confirm/route.ts`, `src/features/search/services/searchService.ts`

**Solução esperada:** Após o fluxo de pagamentos estar em pé — verificar assinatura ativa na checagem de limite; aplicar 20 (total) para free e 200 (mensal) para assinantes.

---

### ~~DT-H1~~ — ✅ Resolvido

`src/middleware.ts` criado. Todas as rotas privadas são interceptadas antes de chegar ao server component: sem sessão → redirect para `/login`; sessão ativa acessando `/login` → redirect para `/dashboard`. Rotas públicas (`/login`, `/auth/callback`, `/api/gmail/callback`) e rotas com autenticação própria (`/api/cron/*`) são excluídas da verificação.

**Nota sobre `proxy.ts`:** Next.js 16 introduziu `proxy.ts` como substituto de `middleware.ts`, mas a convenção `proxy` + Turbopack (bundler padrão no Next.js 16) não gera o arquivo `.next/server/middleware.js.nft.json` esperado pelo adaptador da Vercel — causando ENOENT no deploy. `middleware.ts` (depreciada, mas ainda suportada) contorna o problema porque `isProxyFile()` retorna false, `hasNodeMiddleware` permanece false e o adaptador não tenta ler o arquivo ausente.

---

### DT-H2 — City matching sem normalização de acentos

**Problema:** `global_leads.city` é armazenado como veio do Apify (ex: `"São Paulo"`). A busca usa `ILIKE('city', city)` que é case-insensitive mas não é accent-insensitive. Se o Apify exportou `"Sao Paulo"` e o usuário buscou `"São Paulo"`, os leads não serão encontrados.

**Localização:** `findAvailableGlobalLeadsForUser` em `src/repositories/globalLeadRepository.ts`

**Solução esperada:** Adicionar coluna `city_search_text` em `global_leads` (normalizada via `unaccent` ou app-level), popular no import, buscar por ela em vez de `city`.

---

### DT-H3 — Dedup de import ignorado quando city é null

**Problema:** A regra de dedup do import é `company_name + city`. Se `city` for null no row importado, o bloco `if (companyName && city)` é falso e a verificação de duplicata é pulada — o lead é inserido sem checar.

**Localização:** `src/app/api/admin/import/route.ts` linha com `if (companyName && city)`

**Solução esperada:** Quando `city` é null, checar apenas por `company_name` (ILIKE) ou por `website` se presente.

---

### DT-H4 — Import sem rollback em falha parcial

**Problema:** O import processa rows sequencialmente. Se `createGlobalLead` falhar na metade (ex: erro de DB), os rows já inseridos ficam no banco e os restantes são perdidos. Não há transação nem retry.

**Localização:** loop `for (const row of rows)` em `src/app/api/admin/import/route.ts`

**Solução esperada:** Para volumes pequenos (< 100 rows), processar em uma transação Postgres via RPC. Para volumes maiores, retornar lista de rows com falha para re-importação.

---

## MEDIUM — Impacto em experiência ou manutenção futura

### DT-M1 — Sem paginação no painel Admin

**Problema:** `getGlobalLeadsForAdmin` e `getUsersForAdmin` usam `.limit(20)`. Com base crescendo, o admin vê apenas os 20 primeiros sem ter acesso ao restante.

**Localização:** `src/repositories/adminRepository.ts`

**Solução esperada:** Paginação por cursor ou offset na listagem admin.

---

### DT-M2 — `maxDuration = 10` desnecessário em /api/search/leads

**Problema:** O timeout de 10 segundos foi configurado quando a busca chamava o provider externo (Google Maps). Agora é uma query de banco local (< 1s). O valor é inócuo mas está desatualizado.

**Localização:** `src/app/api/search/leads/route.ts` linha 9

**Solução esperada:** Remover ou reduzir para `maxDuration = 5`.

---

### DT-M3 — Validação de env vars em runtime, não em startup

**Problema:** `getSearchProvider()` lança erro se `GOOGLE_MAPS_API_KEY` não estiver configurada — mas somente quando chamada. Com o fluxo atual (banco global), o provider não é chamado. O erro só seria detectado se alguém tentar ativar o provider manualmente.

**Localização:** `src/features/search/providers/getSearchProvider.ts`

**Solução esperada:** Checar variáveis críticas em `src/lib/config.ts` exportado no startup, com mensagem clara no build ou no início do servidor.

---

### DT-M4 — `SearchOutcome` tem valores não utilizados no fluxo atual

**Problema:** O tipo `SearchOutcome` inclui `'duplicate' | 'no_email' | 'fetch_error' | 'limit_reached'`. Com o fluxo de banco global, o search produz somente `'saved'`. Os outros valores são legados do fluxo provider.

**Localização:** `src/features/search/types.ts`

**Solução esperada:** Manter os tipos enquanto o provider layer for preservado. Revisar ao descontinuar o provider.

---

### DT-M5 — `roadmap.md` desatualizado

**Problema:** O roadmap marca como `[ ]` (não concluídas) fases que já foram implementadas (Fase 6 Busca de Leads, Fase 9 Dashboard, etc.).

**Localização:** `docs/roadmap.md`

**Solução esperada:** Atualizar checkboxes e datas na próxima revisão de documentação.

---

## LOW — Limpeza e qualidade sem impacto em produção

### ~~DT-L1~~ — ✅ Resolvido

Campo `category` removido de `ImportRow` e de `normalizeRaw()` em `parseImportFile.ts` (migration `20240114000000`).

---

### DT-L2 — Loading visual no select de categorias do AdminImportForm

**Problema:** As categorias são carregadas server-side antes de renderizar a página. Não há flicker. Mas se a lista crescer muito, o tempo de renderização da página aumenta sem feedback visual para o admin.

**Localização:** `src/features/admin/components/AdminImportForm.tsx`

**Solução esperada:** Se performance se tornar problema, buscar categorias via `useEffect` client-side com skeleton loading.

---

### DT-L3 — Tabela `leads` (legacy) coexiste com `global_leads` / `user_leads`

**Problema:** A tabela `leads` original ainda existe e coexiste com `global_leads` + `user_leads`. As tabelas `email_threads`, `email_messages`, `followups` e `lead_status_history` têm FK para `leads.id`.

**Estado atual (em progresso):**
- ✅ A aba `/leads` exibe ambas as fontes unificadas na mesma tabela
- ✅ Leads da busca têm página própria em `/leads/global/[id]` com alteração de status e ocultar
- ✅ **Followups** suportam `user_leads`: `followups.user_lead_id` adicionado, `lead_id` tornado nullable; `/leads/global/[id]` exibe seção de acompanhamentos; prompt pós-envio de email ativado para global leads (migration `20260618000000_followups_user_lead_id.sql`)
- ✅ **Gmail Sync** suporta `user_leads`: cron itera `user_lead_id` separadamente via `getUserLeadIdsWithThreads`; `syncGmailRepliesForLead` aceita `leadId: string | null` + `userLeadId?: string | null`; mensagens inbound salvas com o ID correto; `updateLeadLastReplyAt` chamado apenas para legacy leads
- ⚠️ Dashboard KPIs ainda contam apenas leads/followups legacy
- ⚠️ Widget "Respostas Recentes" ainda aponta apenas para leads legacy
- ⚠️ Timeline de emails não exibida em `/leads/global/[id]`
- ⚠️ `getInboundMessagesWithLeads` (inbox) ainda não resolve nome de empresa para mensagens com `user_lead_id`

**Localização:** `supabase/migrations/20240101000000_create_leads.sql`

**Próxima fase:** Unificar KPIs do dashboard, exibir timeline de emails em `/leads/global/[id]`, corrigir inbox para `user_lead_id`.

---

### DT-L4 — `lead_searches` e `lead_search_results` não são utilizadas

**Problema:** As tabelas `lead_searches` e `lead_search_results` foram criadas como parte da arquitetura original mas não têm nenhuma escrita ou leitura no código atual.

**Localização:** `docs/database.md`, migrations

**Solução esperada:** Avaliar se fazem sentido no novo modelo (banco global + user_leads) ou se devem ser removidas.

---

### DT-L5 — Leads visualizados na prévia mas não confirmados não são rastreados

**Problema:** Quando o usuário recebe a prévia de 10 leads e não confirma nenhum (ou confirma apenas alguns), os não-selecionados reaparecem em buscas futuras do mesmo usuário. Não há mecanismo de "dispensar" ou "já vi esse lead".

**Impacto:** Usuário pode ver repetidamente os mesmos leads se não os confirmar. Experiência potencialmente confusa no MVP avançado.

**Localização:** `src/features/search/services/searchService.ts`, `src/repositories/globalLeadRepository.ts`

**Solução esperada:** Tabela `user_lead_views` ou coluna `dismissed_at` para marcar leads visualizados mas não confirmados. Alternativa mais simples: botão "Não me interessou" na prévia que cria registro sem consumir crédito mensal.

---

### DT-L6 — Sem analytics de consumo e dispensa de leads

**Problema:** Não há rastreamento de quantos leads foram visualizados em prévia vs confirmados vs ignorados por usuário/mês. Impossível medir taxa de conversão da busca ou calibrar o limite de 200/mês.

**Localização:** `src/app/api/search/leads/route.ts`, `src/app/api/user-leads/confirm/route.ts`

**Solução esperada:** Registrar eventos de busca (categoria, cidade, qtd preview) e confirmação (qtd selecionados, qtd já owned) em tabela de analytics ou via log estruturado.

---

### DT-L7 — Estado vazio da busca é genérico

**Problema:** Quando a busca retorna 0 leads, a mensagem exibida é genérica ("Nenhum lead encontrado para esta busca"). Não informa se: (a) não há leads nessa categoria/cidade no banco, (b) o usuário já adicionou todos os leads disponíveis, ou (c) não existem leads com `email_found` mas existem com outros status.

**Localização:** `src/features/search/services/searchService.ts`, `src/features/search/components/SearchForm.tsx`

**Solução esperada:** Backend retorna motivo específico no campo `message`: `"Todos os leads disponíveis já foram adicionados"` vs `"Nenhum lead cadastrado para esta combinação"`.

---

### DT-L8 — Dedup do import Apify frágil quando city é null

**(Mesmo que DT-H3 — registrado aqui para referência cruzada)**  
Ver DT-H3 para detalhes. A regra `company_name + city` falha quando city é null, inserindo duplicatas sem verificação.

**Localização:** `src/app/api/admin/import/route.ts`

---

### ~~DT-NOREPLY1~~ — ⚠️ Parcialmente resolvido

**Problema original:** A filtragem de `no_reply` acontecia inteiramente em memória — todos os followups `pending` eram buscados e depois filtrados no app, sem limite efetivo.

**O que foi resolvido (18 Jun 2026):** Adicionado filtro DB-level `.or('type.neq.no_reply,due_at.lte.<now>')` nas duas funções de leitura. Agora o banco retorna apenas `no_reply` já vencidos; manuais passam sem restrição de data.

**O que permanece app-side:** A regra "ocultar se `last_reply_at > created_at`" não pode ser expressa em PostgREST sem RPC, pois compara campo de join (`leads.last_reply_at`) com campo da tabela principal (`followups.created_at`). Continua como `.filter()` após a query.

**Localização:** `getPendingFollowupsByUserId` em `src/repositories/followupRepository.ts`, `getNextFollowups` em `src/features/dashboard/repositories/dashboardRepository.ts`

**Solução completa restante:** Quando o cron de sync de replies detectar resposta inbound, marcar automaticamente como `completed` todos os followups `no_reply` do mesmo lead com `created_at < reply.sent_at` — eliminando a necessidade do filtro app-side. Alternativa: Supabase trigger no insert de `email_messages`.

---

### ~~DT-NOREPLY2~~ — ✅ Reavaliado e resolvido

**Débito original:** `dismissNoReplyFollowupAction` sobrescrevia status sem verificar estado atual.

**Conclusão após reavaliação:** Não existe atualização automática de status no sistema — `sem_resposta` só é gravado via ação explícita do usuário. O botão "Esquecer lead" aparece apenas no dashboard para followups `no_reply` vencidos, e representa uma decisão intencional de abandonar o lead.

**Regra final (V1):** `dismissNoReplyFollowupAction` cancela o followup e seta `sem_resposta` independentemente do status atual. Se o usuário clicou em "Esquecer lead", ele está declarando que não quer mais trabalhar esse lead por falta de resposta — qualquer status anterior é substituído por essa decisão.

**Melhoria futura (não implementada):** Botão "Dispensar lembrete" que cancela apenas o followup sem alterar o status do lead, para casos onde o usuário quer remover o alerta sem desistir do lead.
