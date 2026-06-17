# Débitos Técnicos — Prospecta

Última atualização: 10 Jun 2026

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

**Estado atual (parcialmente resolvido):**
- ✅ A aba `/leads` exibe ambas as fontes unificadas na mesma tabela
- ✅ Leads da busca têm página própria em `/leads/global/[id]` com alteração de status e ocultar
- ⚠️ Envio de email e follow-ups disponíveis apenas para leads manuais (`/leads/[id]`) — funcionalidade depende de `leads.id` FK

**Localização:** `supabase/migrations/20240101000000_create_leads.sql`

**Solução esperada:** Migrar FKs de `email_threads`, `email_messages`, `followups` para suportar `user_leads`. Vincular ao `user_leads.id` em vez de `leads.id`. Deprecar a tabela `leads` após migração completa. Alta complexidade — não urgente para MVP.

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

### DT-NOREPLY1 — Acompanhamentos no_reply filtrados app-side, não marcados automaticamente

**Problema:** A filtragem de `no_reply` acontece em tempo de leitura — o acompanhamento permanece `status='pending'` no banco mesmo após resposta do lead. Quanto mais followups, mais rows buscadas para filtrar.

**Localização:** `getPendingFollowupsByUserId` em `src/repositories/followupRepository.ts`, `getNextFollowups` em `src/features/dashboard/repositories/dashboardRepository.ts`

**Solução esperada:** Quando o cron de sync de replies detectar resposta inbound, marcar automaticamente como `completed` todos os followups `no_reply` do mesmo lead com `created_at < reply.sent_at`. Alternativa: Supabase trigger no insert de `email_messages`.

---

### ~~DT-NOREPLY2~~ — ✅ Reavaliado e resolvido

**Débito original:** `dismissNoReplyFollowupAction` sobrescrevia status sem verificar estado atual.

**Conclusão após reavaliação:** Não existe atualização automática de status no sistema — `sem_resposta` só é gravado via ação explícita do usuário. O botão "Esquecer lead" aparece apenas no dashboard para followups `no_reply` vencidos, e representa uma decisão intencional de abandonar o lead.

**Regra final (V1):** `dismissNoReplyFollowupAction` cancela o followup e seta `sem_resposta` independentemente do status atual. Se o usuário clicou em "Esquecer lead", ele está declarando que não quer mais trabalhar esse lead por falta de resposta — qualquer status anterior é substituído por essa decisão.

**Melhoria futura (não implementada):** Botão "Dispensar lembrete" que cancela apenas o followup sem alterar o status do lead, para casos onde o usuário quer remover o alerta sem desistir do lead.
