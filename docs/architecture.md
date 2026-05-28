# Arquitetura — Prospecta

## Visão Geral

Aplicação fullstack em Next.js com Supabase como backend-as-a-service. Arquitetura modular baseada em features, com separação clara entre responsabilidades.

## Stack

| Camada          | Tecnologia              |
|-----------------|-------------------------|
| Frontend        | Next.js + TypeScript + Tailwind CSS |
| Backend → Next.js App Router / Route Handlers / Server Actions quando fizer sentido|
| Banco/Auth      | Supabase (PostgreSQL)   |
| Storage         | Supabase Storage        |
| Deploy          | Vercel                  |
| Cron Jobs       | Vercel Cron             |
| Busca de Leads  | Apify                   |
| Email           | Gmail API + OAuth Google |
| Validação       | Zod                     |
| Testes          | Vitest + Testing Library |

## Módulos do Sistema

```
/features
  /leads        → gestão de leads (user_leads)
  /templates    → templates de email
  /followups    → controle de follow-ups
  /gmail        → integração Gmail
  /search       → busca no Banco Global (global_leads)
  /dashboard    → métricas e atividades
  /settings     → configurações do usuário e empresa
  /inbox        → emails recebidos (replies)
  /admin        → painel admin: global_leads, categorias, usuários, importação
```

## Camadas da Aplicação

```
/app            → rotas Next.js (pages e API routes)
/components     → componentes UI reutilizáveis
/features       → lógica por domínio (components, hooks, utils do domínio)
/services       → regras de negócio e lógica do sistema
/repositories   → acesso ao banco via Supabase
/integrations   → Gmail API, Apify
/lib            → configurações e clientes (supabase client, etc.)
/types          → tipos TypeScript globais
/validations    → schemas Zod
/hooks          → hooks React globais
/utils          → funções utilitárias globais
/emails         → templates de email transacional
/server         → lógica exclusiva do servidor
```

## Fluxo de Dados

```
UI (React) → API Route (Next.js) → Service → Repository → Supabase
```

## Fluxo de Email

```
Usuário seleciona lead
→ escolhe template
→ edita conteúdo
→ confirma envio
→ Service chama Gmail API
→ email enviado
→ thread registrada no banco
```

## Fluxo de Busca de Leads (atual — Banco Global com Seleção)

```
Admin (uma vez):
  /admin/import → upload JSON/CSV Apify
  → classifyLeadQuality() → global_leads

Usuário:
  Fase 1 — Prévia:
  /search → categoria + cidade
  → POST /api/search/leads
  → findAvailableGlobalLeadsForUser()
      filtra: category_id, city ILIKE, state ILIKE (expandido de UF → nome completo)
              status=active, lead_quality_status=email_found
      exclui: global_lead_ids já em user_leads do usuário
  → retorna até 10 leads como prévia (sem criar user_leads)
  → retorna monthly_remaining (créditos restantes no mês)

  Fase 2 — Confirmação:
  Usuário seleciona leads via checkbox → clica "Adicionar"
  → POST /api/user-leads/confirm
  → valida limite mensal, existência e qualidade dos leads
  → createUserLead apenas para os selecionados
  → UNIQUE (user_id, global_lead_id) garante nunca repetir

Admin:
  → Sem limite mensal, até 50 leads por prévia
  → skipExcludeOwned=true: vê leads já vistos em nova busca
  → monthly_remaining = -1 (ilimitado)
```

**Limite mensal:** 200 leads por usuário por mês UTC (`MONTHLY_LIMIT` em `searchService.ts` e `confirm/route.ts`).

## Search Provider Layer (preservado, fora do fluxo ativo)

O provider layer existe mas não é chamado pelo fluxo de busca do usuário.

```
src/features/search/providers/
  types.ts              → SearchLeadProvider interface, SearchProviderParams, SearchProviderResult
  getSearchProvider.ts  → factory: lê env SEARCH_PROVIDER (default: google_maps)
  googlePlacesProvider.ts → implementação Google Places API
  apifyProvider.ts      → stub (throws "not implemented")
```

**`getSearchProvider()`:** lê `process.env.SEARCH_PROVIDER`. Suporta `google_maps` | `apify`.  
**`googlePlacesProvider`:** chama `textsearch/json` + `getPlaceDetails` + `extractEmailFromWebsite`.  
**`apifyProvider`:** stub — lança erro se chamado.  
**Ativação futura:** conectar provider ao `searchService` ou a um job administrativo separado.

## Sincronização de Replies

```
Vercel Cron (5–15 min)
→ busca threads ativas no banco
→ consulta Gmail API
→ detecta replies novas
→ atualiza banco
→ atualiza status do lead
```

## Auth

```
Supabase Auth (email/senha + Google OAuth)
→ auth.users
→ profiles (identidade)
→ company_profiles (dados comerciais)
```

## Storage

Supabase Storage com buckets:
- `/company-logos`
- `/company-presentations`
- `/template-attachments`

Banco salva apenas o path/url do arquivo.

## Limites do MVP

- 3–10 usuários simultâneos
- 1 conta Gmail por usuário
- 1 empresa por usuário
- Sem multitenancy
- Sem filas complexas
- Sem realtime complexo
- Sem microservices
