# Débitos Técnicos — Prospecta

Última atualização: Maio 2026

---

## HIGH — Impacto direto em segurança, dados ou experiência principal

### DT-H1 — Sem middleware de proteção de rota

**Problema:** Rotas protegidas (`/admin`, `/leads`, `/search`, `/dashboard`, etc.) verificam autenticação dentro do server component via `redirect()`. Sem middleware Next.js, um requisição para `/admin` sem cookie válido passa pelo runtime do servidor antes de ser redirecionada.

**Risco:** Exposição de tempo de processamento. Em teoria, um servidor lento poderia parcialmente renderizar antes do redirect. Middleware protegeria antes de chegar ao componente.

**Localização:** todas as páginas em `src/app/(app)/`

**Solução esperada:** `src/middleware.ts` com `matcher` cobrindo `/(app)(.*)` — redireciona para `/login` se sem sessão.

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

### DT-L1 — Campo `category` em `ImportRow` é parseado mas ignorado

**Problema:** `parseImportFile.ts` ainda extrai o campo `category` do JSON/CSV do Apify para montar `ImportRow`. A API de import (`/api/admin/import`) não aceita mais esse campo (foi removido do `importRowSchema`). O campo é stripado pelo Zod sem ser usado.

**Localização:** `src/features/admin/utils/parseImportFile.ts` — campo `category` na função `normalizeRaw`

**Solução esperada:** Remover `category` do tipo `ImportRow` e da função `normalizeRaw`.

---

### DT-L2 — Loading visual no select de categorias do AdminImportForm

**Problema:** As categorias são carregadas server-side antes de renderizar a página. Não há flicker. Mas se a lista crescer muito, o tempo de renderização da página aumenta sem feedback visual para o admin.

**Localização:** `src/features/admin/components/AdminImportForm.tsx`

**Solução esperada:** Se performance se tornar problema, buscar categorias via `useEffect` client-side com skeleton loading.

---

### DT-L3 — Tabela `leads` (legacy) coexiste com `global_leads` / `user_leads`

**Problema:** A tabela `leads` original (criada em migration `20240101000000`) ainda existe no banco. O sistema atual usa `global_leads` + `user_leads`. A tabela `leads` é usada por `email_threads`, `email_messages`, `followups` e `lead_status_history` via FK.

**Localização:** `supabase/migrations/20240101000000_create_leads.sql`

**Solução esperada:** Plano de migração para vincular threads/followups ao `user_leads` e deprecar a tabela `leads`. Não é urgente — o sistema de email usa `leads` ativamente.

---

### DT-L4 — `lead_searches` e `lead_search_results` não são utilizadas

**Problema:** As tabelas `lead_searches` e `lead_search_results` foram criadas como parte da arquitetura original mas não têm nenhuma escrita ou leitura no código atual.

**Localização:** `docs/database.md`, migrations

**Solução esperada:** Avaliar se fazem sentido no novo modelo (banco global + user_leads) ou se devem ser removidas.
