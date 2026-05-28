# Changelog — Prospecta

---

## Maio 2026 — Ciclo MVP Principal

### Banco Global de Leads

Decisão arquitetural central do MVP: leads não pertencem mais somente ao usuário. Existe um repositório global (`global_leads`) abastecido pelo admin e consultado pelo usuário.

- Criadas tabelas `global_leads` e `user_leads` (migration `20240109000000`)
- `global_leads`: empresa única, sem dono, abastecida pelo admin
- `user_leads`: vínculo usuário → global_lead com status, notas e timeline próprios
- Constraint `UNIQUE (user_id, global_lead_id)` garante que o mesmo lead nunca é entregue duas vezes ao mesmo usuário
- RLS: usuário vê apenas seus `user_leads`; `global_leads` visíveis apenas com `status = active`

---

### Admin V1

Painel administrativo somente para usuários com `profiles.role = 'admin'`.

- Rota `/admin` com proteção por role (redirect para `/dashboard` se não-admin)
- Visualização de `global_leads`, categorias e usuários
- Link "Admin" no nav visível somente para admins
- Migrations: `20240112000000_admin_rls_policies.sql` — políticas RLS para admin ver todos os status e todos os profiles

---

### Lead Quality Pipeline

Classificação automática de qualidade de leads no momento da criação.

- Nova coluna `lead_quality_status` em `global_leads` (migration `20240113000000`)
- Valores: `email_found` | `website_only` | `manual_review` | `invalid`
- `classifyLeadQuality({ email, website })` em `src/utils/classifyLeadQuality.ts` — aplicado em todo `createGlobalLead`
- Backfill de rows existentes via migration
- Admin vê Lead Quality Overview (4 cards) e Manual Review Queue (tabela)
- Índice `global_leads_quality_status_idx` para performance

---

### Admin Apify Intake Pipeline

Intake manual de exportações do Apify via upload de arquivo.

- Rota `/admin/import` — somente admin
- Upload de `.json` e `.csv` exportados do Apify
- Select obrigatório de categoria (vem do banco, não hardcoded)
- Preview de 20 rows antes de confirmar
- Dedup: `company_name + city` — não insere se já existe
- `classifyLeadQuality()` aplicado em cada row
- Rows sem `company_name` contados como `invalid`, não inseridos
- `provider_source: 'apify'` em todos os leads importados
- Resumo final: Importados / Ignorados / Inválidos / Email Found / Website Only / Manual Review
- API: `POST /api/admin/import` — validação de `category_id` contra banco

---

### Search Provider Layer

Desacoplamento entre o serviço de busca e os providers externos.

- Interface `SearchLeadProvider` com `search(params): Promise<SearchProviderResult[]>`
- `googlePlacesProvider(apiKey)`: factory que encapsula Google Places API + extração de email
- `apifyProvider()`: stub — lança erro se chamado
- `getSearchProvider()`: factory lê `SEARCH_PROVIDER` env var (default: `google_maps`)
- `searchService.ts` passou a usar `getSearchProvider()` em vez de importar integrações diretamente

---

### Cities Autocomplete

Substituição do campo livre de cidade por autocomplete com catálogo próprio.

- Tabela `cities` criada (migration `20240111000000`) com 20 cidades seedadas
- Campo `search_text` normalizado (sem acentos) para busca robusta
- `GET /api/cities?q=` — retorna até 10 cidades por busca
- `SearchForm` atualizado: debounce 250ms, dropdown, seleção obrigatória da lista
- Backend valida cidade contra `cities` antes de processar a busca

---

### Categorias Dinâmicas no Search

Categorias deixaram de ser hardcoded no frontend.

- `search/page.tsx` busca `listLeadCategories(supabase)` server-side
- Passa `categories: Category[]` como prop para `SearchForm`
- Backend valida categoria informada contra `lead_categories` antes de processar
- 22 categorias seedadas em `20240109000000` (reduzidas para 5 em `20240114000000`)

---

### Search consome Banco Global (migração principal)

Mudança arquitetural: `/search` parou de chamar providers externos e passou a consultar o banco global.

- `searchService.ts` reescrito: usa `findAvailableGlobalLeadsForUser()` em vez de `getSearchProvider()`
- `findAvailableGlobalLeadsForUser`: filtra `global_leads` por category_id + city + status=active + lead_quality_status=email_found, excluindo IDs já em `user_leads` do usuário
- Resposta inclui `message` quando não há leads disponíveis
- Provider layer preservado mas fora do fluxo ativo
- SearchForm: texto de loading atualizado para "Buscando leads disponíveis..."
- SearchResults: exibe `response.message` quando resultados vazios

---

### Backend Validation — Categoria e Cidade

Validação de existência de categoria e cidade contra o banco antes de processar busca.

- `getLeadCategoryByName` verifica se categoria existe
- `findCity` verifica se cidade existe na tabela `cities`
- Retorna 400 com mensagem amigável se algum não for encontrado

---

### Busca com Seleção de Leads (Plano Bronze MVP)

Mudança de produto: busca deixou de criar `user_leads` automaticamente. Usuário agora escolhe quais leads quer adicionar.

- `POST /api/search/leads` retorna até 10 leads como **prévia** (sem inserir nada no banco)
- Novo `POST /api/user-leads/confirm` recebe IDs selecionados, valida tudo e cria `user_leads` apenas para os escolhidos
- Leads não selecionados continuam disponíveis no banco global para buscas futuras
- Sair da tela sem confirmar não consome créditos
- Limite migrado de **5 leads/dia** para **200 leads/mês** (Plano Bronze)
- Admin: sem limite mensal (`monthly_remaining = -1`), previews de até 50 leads, pode rever leads já vistos
- `SearchForm` ganhou checkboxes, botão "Adicionar selecionados" e confirmação pós-adição
- `SearchResults` reescrito como lista de cards selecionáveis
- `stateUtils.ts`: normaliza UF de 2 letras para nome completo do estado antes do filtro SQL (fix bug RS → Rio Grande do Sul)
- `DT-M2` resolvido: `maxDuration` removido de `/api/search/leads` (era resquício do provider externo)

---

### Redução de Categorias para 5 Nichos Oficiais

MVP focado em 5 nichos industriais/comerciais com alto potencial B2B.

- Migration `20240114000000`: inseriu 2 novas categorias (Construção Civil, Consultórios Médicos) e removeu as 17 restantes
- `global_leads.category_id` FK é `ON DELETE SET NULL` — nulled automaticamente para leads das categorias removidas
- Categorias oficiais: **Metalúrgica**, **Indústria Plástica**, **Construção Civil**, **Restaurantes**, **Consultórios Médicos**
- Frontend já era 100% dinâmico (sem hardcode) — nenhuma alteração necessária no código TypeScript
- DT-L1 resolvido: campo `category` removido de `ImportRow` e `normalizeRaw()` em `parseImportFile.ts` — campo do Apify era parseado mas ignorado pela API desde a implementação da seleção obrigatória de categoria no admin

---

## Pendente (próximo ciclo)

- Middleware de proteção de rotas (DT-H1)
- Normalização de city para city matching sem acentos (DT-H2)
- Paginação no Admin (DT-M1)
- Atualização do `roadmap.md`
