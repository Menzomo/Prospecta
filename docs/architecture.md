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
  /leads        → gestão de leads
  /templates    → templates de email
  /followups    → controle de follow-ups
  /gmail        → integração Gmail
  /search       → busca de leads via Apify
  /dashboard    → métricas e atividades
  /settings     → configurações do usuário e empresa
  /inbox        → emails recebidos (replies)
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

## Fluxo de Busca de Leads

```
Usuário define categoria + cidade
→ API Route aciona Apify
→ resultados retornam
→ deduplicação aplicada
→ leads salvos no banco
```

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
