# Changelog — Prospecta

---

## Junho 2026 — DT-H1: Middleware de proteção de rotas

Criado `src/middleware.ts` resolvendo o débito técnico DT-H1. O middleware intercepta todas as requisições antes de chegarem ao server component.

### Comportamento
- **Sem sessão → rota privada**: redireciona para `/login` imediatamente, sem processar o componente
- **Sessão ativa → `/login`**: redireciona para `/dashboard`
- **Rotas públicas** (`/login`, `/auth/callback`, `/api/gmail/callback`): sempre passam sem verificação
- **Rotas com auth própria** (`/api/cron/*`): bypass completo (usam `Authorization` header)
- Sessão Supabase é **sempre renovada** via `updateSession()` em cada requisição, garantindo que cookies não expirem silenciosamente

### Histórico
A primeira implementação usou `src/proxy.ts` (convenção do Next.js 16), mas o deploy na Vercel falhou com ENOENT em `.next/server/middleware.js.nft.json`. Causa: Turbopack (bundler padrão no Next.js 16) não executa o rename `proxy.js.nft.json → middleware.js.nft.json` que o adaptador da Vercel espera. Solução: `middleware.ts` contorna o problema pois `isProxyFile()` retorna false, `hasNodeMiddleware` fica false e o adaptador não tenta abrir o arquivo ausente.

---

## Junho 2026 — Fix: erro "Dados inválidos" ao confirmar leads da busca

**Bug:** O endpoint `/api/user-leads/confirm` tinha `.max(10)` no schema Zod. Admins selecionando 50 leads (e usuários em edge cases com mais de 10) recebiam "Dados inválidos" e nenhum lead era adicionado.

**Causa raiz:** Limite arbitrário de `max(10)` na validação da rota, incompatível com o limite real de busca para admins (50 leads).

### Correções

- **`/api/user-leads/confirm`**: `.max(10)` → `.max(200)` (alinhado ao limite mensal real); o cap operacional para usuários comuns continua sendo o `monthly_remaining` calculado no servidor
- **`skipped_invalid`**: Leads que existem no banco mas não passam no filtro `status=active` + `lead_quality_status=email_found` agora são contados e logados no servidor (com `userId` e IDs dos leads problemáticos para revisão admin) em vez de serem descartados silenciosamente
- **`ConfirmLeadsResponse`**: Adicionado campo `skipped_invalid: number`
- **UI de sucesso** (`SearchForm`): Agora exibe breakdown completo — "X leads adicionados. Y já estavam em Leads. Z não puderam ser adicionados por dados incompletos."

---

## Junho 2026 — Ações diretas na listagem de Leads

Botões "Enviar email" e "Detalhes" adicionados diretamente na tabela de `/leads`, eliminando a necessidade de entrar no detalhe do lead para iniciar um envio.

### Banco de dados
- **Migration `20260611000000_email_support_global_leads`**: `lead_id` tornou-se nullable em `email_threads` e `email_messages`; adicionado `user_lead_id uuid references user_leads(id)` em ambas as tabelas para suportar envio de email a leads vindos da busca

### Leads da busca (global leads)
- **`sendEmailFromUserLeadAction`** (novo em `email/actions.ts`): action server para envio de email a global leads, espelhando `sendEmailAction` mas usando `user_lead_id` em vez de `lead_id`
- **`markUserLeadContacted`** (novo em `userLeadRepository`): atualiza status do `user_lead` para `contatado` após envio
- **`/leads/global/[id]/send`** (nova página): página de envio de email para leads da busca; após envio bem-sucedido redireciona para `/leads/global/[id]` sem prompt de acompanhamento (followup disponível apenas para leads manuais por ora)

### Componente SendEmailForm
- Refatorado para aceitar `boundAction` (action pré-vinculada) em vez de `leadId` — desacoplado do tipo de lead
- Novo prop `followup?: { leadId }` para exibir `PostSendFollowupPrompt` após envio (leads manuais)
- Novo prop `returnPath?: string` para redirecionar diretamente após envio (leads da busca)

### emailSendService
- `SendEmailInput` agora aceita `leadId?` ou `userLeadId?` — escolhe automaticamente qual repositório marcar como contatado

### Listagem `/leads`
- Coluna de ações substituída por três controles por linha: **Enviar email** (azul), **Detalhes** (cinza), **Ocultar** (texto)
- Nome da empresa deixou de ser link de navegação; navegação agora é feita pelo botão "Detalhes"
- Funciona para leads manuais e leads da busca

---

## Junho 2026 — Acompanhamento pós-envio de email (no_reply)

Após enviar um email para um lead, o usuário pode criar um acompanhamento de "sem resposta" em 2 cliques. Se o lead responder antes do prazo, o acompanhamento some automaticamente do dashboard.

### Banco de dados
- **Migration `20260606000000_followups_add_type`**: adicionado `type text not null default 'manual'` e `email_message_id uuid references email_messages(id) on delete set null` à tabela `followups`

### Fluxo pós-envio
- **`sendEmailService`**: retorna `emailMessageId` (UUID do banco) além de `gmailMessageId`
- **`sendEmailAction`**: em vez de redirecionar para o lead no sucesso, retorna `{ success: true, emailMessageId }` — o redirect agora acontece após a decisão do usuário sobre o acompanhamento
- **`SendEmailForm`**: ao receber `state.success`, substitui o formulário pelo `PostSendFollowupPrompt`
- **`PostSendFollowupPrompt`** (novo): componente client com 4 opções — "Lembrar em 2 dias", "Lembrar em 5 dias", "Escolher data", "Não criar"; ao confirmar, chama `createNoReplyFollowupAction` e navega para o lead

### Actions de acompanhamento
- **`createNoReplyFollowupAction`**: cria followup com `type='no_reply'`, `email_message_id`, `title='Verificar resposta ao email enviado'`
- **`dismissNoReplyFollowupAction`**: cancela o followup (`status='cancelled'`) e atualiza status do lead para `sem_resposta` — acionado pelo botão "Esquecer lead" no dashboard

### Filtragem inteligente
- **`getPendingFollowupsByUserId`** e **`getNextFollowups`**: acompanhamentos `no_reply` são filtrados app-side quando `leads.last_reply_at > followup.created_at` — o lead respondeu, então não é mais relevante alertar

### Dashboard
- **`NextFollowup` type**: inclui campo `type`
- **`getNextFollowups`**: busca até 10, filtra no_reply com resposta recente, retorna os 3 mais próximos
- **`NextFollowups` component**: acompanhamentos `no_reply` exibem badge "Sem resposta", label descritivo e ações "Enviar novo email" / "Esquecer lead"

### Lead detail
- **`FollowupItem`**: badge "Sem resposta" (âmbar) para `no_reply`, badge "Manual" (cinza) para `manual`
- **`/followups` page**: mesmos badges na listagem global de acompanhamentos pendentes

### Repositórios
- **`leadRepository.updateLeadStatus`** (novo): atualiza `leads.status` com validação de `user_id`

---

## Junho 2026 — Terminologia "Followups" → "Acompanhamentos" (V1)

Terminologia Followups substituída por Acompanhamentos na interface da V1.

- **AppNav**: label do item `/followups` alterado de "Followups" para "Acompanhamentos"
- **DashboardKpis**: KPI "Followups pendentes" → "Acompanhamentos pendentes"
- **NextFollowups**: título "Próximos followups" → "Próximos acompanhamentos"; estado vazio "Nenhum followup pendente." → "Nenhum acompanhamento pendente."
- **Dashboard page**: botão "Ver followups" → "Ver acompanhamentos"
- Sem alterações em rotas, tabelas, repositories, services, APIs ou banco de dados

---

## Junho 2026 — Inbox removido da navegação (V1)

Aba **Inbox** removida do menu principal. Respostas de leads são tratadas exclusivamente no detalhe do lead via botão "Respostas recebidas".

- **AppNav**: item `/inbox` removido de `NAV_ITEMS` — rota e código mantidos, apenas ocultos da navegação
- **Dashboard**: link "Ver inbox" removido dos atalhos rápidos
- **LeadRepliesCard, LeadRepliesButton, LeadTimeline**: fallback `/inbox` substituído — quando `gmail_thread_id` não está disponível, exibe "Link do Gmail indisponível" em vez de redirecionar para a rota interna

---

## Junho 2026 — UX Lead Timeline e Respostas

### Marcar resposta como lida — Lead detail

Usuário pode marcar individualmente cada resposta de lead como lida diretamente no modal de notificações.

- **`markEmailMessageAsRead`** — nova função no `emailRepository.ts`; atualiza `is_read = true` e `read_at = now()` para um único message; valida `user_id` para garantir ownership
- **`markSingleReplyAsReadAction`** — server action em `inbox/actions.ts`; valida sessão, chama repositório, revalida `/dashboard` e `/inbox` para atualizar contadores
- **`LeadRepliesButton`** atualizado:
  - Estado otimístico: `readIds: Set<string>` inicializado com messages já `is_read: true` do servidor
  - Badge conta apenas respostas não lidas (`unread.length`)
  - Cada card de resposta no modal ganha botão "Marcar como lida": atualiza estado local imediatamente via `useTransition`, persiste no banco em background
  - Modal fecha automaticamente quando todas as respostas são marcadas
  - "Sem respostas" exibido no header quando `unread.length === 0`
- **`MarkInboxRead` removido de `/leads/[id]`**: componente marcava todas as respostas como lidas automaticamente na abertura da página, conflitando com o modelo de marcação individual; marcação agora é exclusivamente por ação explícita do usuário
- Sem migration necessária — campos `is_read` e `read_at` já existiam em `email_messages`
- Timeline continua exibindo todas as respostas independente do status de leitura

### Lead Replies Card e Timeline melhorada

Melhoria de UX no detalhe do lead: respostas recebidas agora têm um card dedicado com ação direta para o Gmail, e o histórico continua colapsável e sem expor corpo do email.

- **`LeadRepliesCard`** — novo card azul com ícone de sino exibido apenas quando há respostas inbound; mostra resumo de cada resposta ("Lead respondeu ao email", data/hora, assunto truncado) e botão "Abrir no Gmail" por item; link usa `gmail_thread_id` quando disponível, fallback para `/inbox`
- **Timeline — corpo ocultado** — timeline nunca exibiu o corpo das respostas (apenas assunto truncado); comportamento documentado e validado
- **Fix: threads passado para `LeadTimeline`** — `page.tsx` não estava buscando nem passando `threads` ao componente, fazendo todos os links "Abrir no Gmail" na timeline caírem para `/inbox`; corrigido com `getEmailThreadsByLeadId` adicionado ao `Promise.all` e prop passada
- **Organização da página** — ordem na coluna: status card → editar dados → follow-ups → card de respostas (sino) → histórico compacto
- Não altera envio de email, OAuth Gmail, banco de dados ou armazenamento de corpo das mensagens

---

## Maio 2026 — Ciclo MVP Principal (continuação 2)

### Import Apify Assíncrono — apify_import_jobs

Importação de leads via Apify migrada para fluxo assíncrono com jobs persistidos.

- Tabela `apify_import_jobs`: rastreia status de cada run Apify por nicho/cidade/limite
- `POST /api/admin/import-apify`: inicia run na Apify e salva job — retorna imediatamente sem bloquear
- `POST /api/admin/import-apify/jobs/[id]/sync`: consulta Apify, processa dataset e insere em global_leads
  - Dedup: placeId → website → company_name + city
  - classifyLeadQuality() aplicado em cada item
  - Atualiza contadores e status do job
- `/admin/import-apify`: exibe status Apify, formulário de importação e lista de jobs recentes com botão "Atualizar status"
- Limite restaurado para 5–200 leads por importação (default 200)
- Confirmação visual antes de iniciar — mostra nicho, cidade e quantidade
- `CityAutocomplete`: componente extraído e reutilizado em `/search` e `/admin/import-apify`
- Débito técnico: automatizar sync de jobs via Vercel Cron (registrado em technical_debt.md como DT-APIFY1)

### Admin — Dashboard de Estoque

- Estoque global por nicho: disponíveis / consumidos / total com alerta quando < 200
- Estoque por usuário e nicho: quais usuários estão com baixo estoque em cada categoria
- Botão "Importar Mais" com nicho pré-selecionado ao clicar pelo dashboard de estoque

---

## Maio 2026 — Ciclo MVP Principal (continuação)

### Admin V2 — Dashboard por Nicho e Global Leads Filtrável

Reorganização e expansão do painel admin para suportar gestão do banco global por nicho.

- **Leads por Nicho:** nova seção com tabela de totais por categoria (total, email_found, website_only, manual_review, invalid) — categorias dinâmicas via `lead_categories`, agregação app-side em `getLeadStatsByCategory`
- **Global Leads:** expandido de 20 para 50 leads, agora filtráveis por nicho e cidade via GET params (`?category=slug&city=texto`) — form submit sem JS, limpar filtros disponível
- **Colunas adicionadas:** Nicho e Qualidade na tabela Global Leads
- **Organização visual:** Overview geral → Resumo por Nicho → Leads sem Email → Global Leads — mesma separação em todas as larguras
- **Correção checkbox busca:** `e.stopPropagation()` movido de `onChange` para `onClick` no checkbox — seleção individual agora funciona corretamente (toggle duplo corrigido)
- **Correção owned leads:** filtro in-memory adicionado em `findAvailableGlobalLeadsForUser` como camada extra — leads já adicionados nunca aparecem na busca mesmo se o NOT IN do SQL falhar silenciosamente

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

---

### Aba Leads Unificada — /leads

A aba Leads passou a exibir as duas fontes de leads na mesma tabela: leads manuais (tabela `leads`) e leads confirmados via busca (tabela `user_leads` + `global_leads`).

- `getUserLeadsWithGlobalData()` adicionado a `userLeadRepository.ts` — join `user_leads` com `global_leads` via PostgREST, retorna shape unificado com `category_id`
- `/leads/page.tsx` reescrito: busca ambas as fontes em paralelo (`Promise.all`), renderiza na mesma tabela
- Leads manuais linkam para `/leads/[id]`; leads da busca linkam para `/leads/global/[id]`
- Botão "Ocultar" disponível para ambas as fontes (`hideLeadAction` e `hideUserLeadAction`)

---

### Filtros por Nicho e Cidade na Aba Leads

- Filtro de nicho: `<select>` preenchido dinamicamente do banco (`lead_categories`), submetido via GET param `?category=<slug>`
- Filtro de cidade: input de texto, GET param `?city=`, substring match app-level
- Botão "Limpar filtros" aparece somente quando filtro ativo
- Contador de leads exibido acima da tabela
- Coluna "Nicho" adicionada — leads manuais exibem "Sem categoria" (tabela `leads` não possui `category_id`)
- Quando filtro de nicho específico está ativo, leads manuais são ocultados (comportamento esperado)

---

### Detalhe de Lead da Busca — /leads/global/[id]

Nova página para leads confirmados via busca (user_leads).

- Exibe dados da empresa (somente-leitura) do `global_leads`: nome, email, telefone, site, cidade, estado
- Exibe status atual com badge colorido
- Formulário para alterar status (server action com redirect)
- Botão "Ocultar lead" (server action, redireciona para `/leads`)
- Sem funcionalidade de email ou follow-up (FKs dependem de `leads.id` — DT-L3)

---

### UX — Feedback already_owned na Confirmação de Leads

- `/api/user-leads/confirm` passou a retornar `already_owned` — quantidade de leads selecionados que já estavam em `user_leads`
- `SearchForm.tsx` exibe mensagem específica para cada caso: `added > 0`, `already_owned > 0`, combinação dos dois, ou zero de ambos
- Tipo `ConfirmLeadsResponse` atualizado com campo `already_owned: number`

---

### Admin — Edição Manual de Email em Leads Globais

Permite que o admin adicione email manualmente a leads importados sem email e os libere para o banco pesquisável.

- Nova rota `/admin/global-leads/[id]` — detalhe completo de qualquer `global_lead` (somente admin)
- Formulário de email com validação (Zod, server action) — ao salvar: `email`, `lead_quality_status = email_found`, `status = active`, `updated_at`
- Lead promovido aparece imediatamente nas buscas de usuários (`status=active + lead_quality_status=email_found`)
- Fila "Leads sem Email" expandida: agora inclui `website_only` E `manual_review` (antes só `manual_review`), limite aumentado de 20 para 50
- Link "Adicionar email" em cada linha da fila; tabela Global Leads tornou-se clicável (nome da empresa → detalhe)
- `src/features/admin/actions.ts` criado com `addEmailToGlobalLeadAction` (server action, estado com `useActionState`)
- `src/features/admin/components/GlobalLeadEmailForm.tsx` — form client component
- `src/repositories/globalLeadRepository.ts` — nova função `updateGlobalLeadEmailAndPromote`
- `src/repositories/adminRepository.ts` — nova função `getGlobalLeadByIdForAdmin` + tipo `AdminGlobalLeadDetail`

---

## Pendente (próximo ciclo)

- Middleware de proteção de rotas (DT-H1)
- Normalização de city para city matching sem acentos (DT-H2)
- Paginação no Admin (DT-M1)
- Atualização do `roadmap.md`
