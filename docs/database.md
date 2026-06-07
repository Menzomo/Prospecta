# Banco de Dados — Prospecta

## Plataforma

Supabase (PostgreSQL)

## Padrões Globais

Todas as tabelas principais devem ter:

```sql
id         uuid primary key default gen_random_uuid()
user_id    uuid  -- ownership
created_at timestamptz
updated_at timestamptz
```

## Status Strategy

Não usar ENUM PostgreSQL. Usar `text` com validação na aplicação via Zod.

## Delete Strategy

- Delete real quando o dado não precisa ser preservado
- `is_hidden` + `hidden_at` quando o dado precisa ser oculto mas não apagado (ex: leads removidos)

## Tabelas

### auth.users
Gerenciada pelo Supabase Auth. Não modificar diretamente.

---

### profiles
Identidade do usuário.

| Campo      | Tipo        | Obs                     |
|------------|-------------|-------------------------|
| id         | uuid PK     |                         |
| email      | text        |                         |
| full_name  | text        |                         |
| avatar_url | text        |                         |
| role       | text        | `"admin"` \| `"user"` (default: `"user"`) |
| created_at | timestamptz |                         |
| updated_at | timestamptz |                         |

**role:** controla acesso ao painel `/admin` e às políticas RLS de admin.  
Verificação feita em server components via `profile.role !== 'admin'` → redirect `/dashboard`.

---

### company_profiles
Dados comerciais da empresa do usuário.

| Campo                    | Tipo        | Obs            |
|--------------------------|-------------|----------------|
| id                       | uuid PK     |                |
| user_id                  | uuid UNIQUE | FK → profiles  |
| company_name             | text        |                |
| description              | text        |                |
| city                     | text        |                |
| phone                    | text        |                |
| commercial_email         | text        |                |
| website                  | text        |                |
| logo_path                | text        | path no Storage |
| presentation_pdf_path    | text        | path no Storage |
| created_at               | timestamptz |                |
| updated_at               | timestamptz |                |

Regra: 1 usuário = 1 empresa (user_id UNIQUE).

---

### gmail_connections
Tokens e estado da integração Gmail por usuário.

| Campo               | Tipo        | Obs                                  |
|---------------------|-------------|--------------------------------------|
| id                  | uuid PK     |                                      |
| user_id             | uuid UNIQUE | FK → auth.users                      |
| gmail_email         | text        | conta Gmail conectada                |
| provider_account_id | text        | sub do Google (identificador Google) |
| access_token        | text        | temporário, expira rapidamente       |
| refresh_token       | text        | principal token persistido           |
| expires_at          | timestamptz |                                      |
| scope               | text        | escopos OAuth autorizados            |
| is_connected        | boolean     | true = conectado, false = desconectado |
| connected_at        | timestamptz |                                      |
| disconnected_at     | timestamptz |                                      |
| created_at          | timestamptz |                                      |
| updated_at          | timestamptz |                                      |

Regra: 1 conexão Gmail por usuário (user_id UNIQUE).
Segurança: tokens nunca expostos no frontend. Logs sem tokens completos.

---

### lead_categories
Catálogo global de categorias de prospecção.

| Campo            | Tipo        | Obs                                  |
|------------------|-------------|--------------------------------------|
| id               | uuid PK     |                                      |
| name             | text        | ex: "Restaurantes"                   |
| slug             | text UNIQUE | ex: "restaurantes"                   |
| search_terms     | text[]      | termos usados no provider de busca   |
| confidence_rules | jsonb       | regras futuras de score (preparado)  |
| created_at       | timestamptz |                                      |
| updated_at       | timestamptz |                                      |

**5 categorias oficiais do MVP** (Metalúrgica, Indústria Plástica, Construção Civil, Restaurantes, Consultórios Médicos — migration `20240114000000`).

RLS: leitura para qualquer usuário autenticado. Escrita restrita a admin.

---

### leads
**Tabela de leads manuais.** Leads criados diretamente pelo usuário via `/leads/new`.  
Coexiste com `global_leads` / `user_leads` (DT-L3). As tabelas `email_threads`, `email_messages`, `followups` e `lead_status_history` têm FK para `leads.id`, não para `user_leads`.

| Campo             | Tipo        | Obs                     |
|-------------------|-------------|-------------------------|
| id                | uuid PK     |                         |
| user_id           | uuid        | FK → profiles           |
| company_name      | text        |                         |
| contact_name      | text        |                         |
| email             | text        |                         |
| phone             | text        |                         |
| website           | text        |                         |
| city              | text        |                         |
| source            | text        | apify / manual          |
| status            | text        | ver Status Oficiais     |
| notes             | text        |                         |
| is_hidden         | boolean     | default false           |
| hidden_at         | timestamptz |                         |
| last_contacted_at | timestamptz |                         |
| last_reply_at     | timestamptz |                         |
| created_at        | timestamptz |                         |
| updated_at        | timestamptz |                         |

**Status oficiais dos leads:**
- `novo`
- `contatado`
- `interessado`
- `negociacao`
- `responder_depois`
- `sem_interesse`
- `sem_resposta`

**Deduplicação:** Lead duplicado se existir mesmo `user_id + email` OU `user_id + website`.

**Leads removidos:** usar `is_hidden = true` + `hidden_at`. Nunca reaparecem em buscas.

---

### lead_status_history
Histórico de mudanças de status do lead.

| Campo      | Tipo        |
|------------|-------------|
| id         | uuid PK     |
| user_id    | uuid        |
| lead_id    | uuid        | FK → leads |
| from_status| text        |
| to_status  | text        |
| created_at | timestamptz |

---

---

### global_leads
Banco global de empresas. NÃO pertence a nenhum usuário. Abastecido via `/admin/import` pelo admin.

| Campo                | Tipo        | Obs                                                  |
|----------------------|-------------|------------------------------------------------------|
| id                   | uuid PK     |                                                      |
| company_name         | text        | obrigatório                                          |
| email                | text        | opcional                                             |
| website              | text        | opcional                                             |
| phone                | text        | opcional                                             |
| city                 | text        | opcional — armazenado como veio do Apify             |
| state                | text        | opcional — código UF (ex: "SP", "RS")                |
| category_id          | uuid        | FK → lead_categories (nullable)                      |
| confidence_score     | integer     | default 0 (preparado para scoring futuro)            |
| provider_source      | text        | `"apify"` \| `"google_maps"` (ver valores abaixo)    |
| provider_external_id | text        | ID externo no provider (opcional)                    |
| status               | text        | `active` \| `hidden` \| `invalid`                   |
| review_required      | boolean     | default true                                         |
| lead_quality_status  | text        | `email_found` \| `website_only` \| `manual_review` \| `invalid` — default `manual_review` |
| created_at           | timestamptz |                                                      |
| updated_at           | timestamptz |                                                      |

**lead_quality_status — valores oficiais:**

| Valor          | Quando é atribuído                                      |
|----------------|---------------------------------------------------------|
| `email_found`  | email preenchido e não vazio                            |
| `website_only` | website preenchido, email vazio                         |
| `manual_review`| sem email e sem website — precisa revisão               |
| `invalid`      | company_name vazio na importação (não salvo no banco)   |

Classificação feita por `classifyLeadQuality()` em `src/utils/classifyLeadQuality.ts`.  
O status `invalid` na contagem do resumo do import é computado antes do insert — rows inválidos nunca chegam ao banco.

**provider_source — valores conhecidos:**

| Valor         | Origem                                       |
|---------------|----------------------------------------------|
| `apify`       | Import manual via `/admin/import`            |
| `google_maps` | Provider Google Places (fora do fluxo ativo) |

**Search entrega somente:** `status = active` AND `lead_quality_status = email_found`.

RLS: SELECT para qualquer usuário autenticado (apenas `status = active`). Admin vê todos os status.  
INSERT permitido a usuários autenticados (migration `20240110000000`).

---

### user_leads
**Fase 1 — Banco Global Prospecta.**
Vínculo entre usuário e um lead global. Cada usuário possui status, timeline e followups próprios.

| Campo          | Tipo        | Obs                                  |
|----------------|-------------|--------------------------------------|
| id             | uuid PK     |                                      |
| user_id        | uuid        | FK → auth.users                      |
| global_lead_id | uuid        | FK → global_leads                    |
| status         | text        | ver Status Oficiais dos Leads        |
| hidden         | boolean     | default false                        |
| notes          | text        | opcional                             |
| last_contacted | timestamptz | opcional                             |
| created_at     | timestamptz |                                      |
| updated_at     | timestamptz |                                      |

**Constraint:** UNIQUE (user_id, global_lead_id) — lead não se duplica por usuário.

Cada lead global pode ter vínculos com múltiplos usuários, cada um com status, notas e timeline independentes.

RLS: padrão por user_id.

---

### cities
Catálogo de cidades para autocomplete no Search. NÃO pertence a nenhum usuário.

| Campo       | Tipo        | Obs                                                  |
|-------------|-------------|------------------------------------------------------|
| id          | uuid PK     |                                                      |
| name        | text        | nome com acentos (ex: "São Paulo")                   |
| state       | text        | nome do estado (ex: "São Paulo")                     |
| state_code  | text        | UF 2 chars (ex: "SP")                                |
| search_text | text        | nome normalizado sem acentos (ex: "sao paulo") — para busca robusta |
| created_at  | timestamptz |                                                      |

**Seedadas:** 20 cidades principais no Brasil (migration `20240111000000`).  
**Autocomplete:** `GET /api/cities?q=` — busca por `name ILIKE` ou `search_text ILIKE` (normalizado).  
**RLS:** SELECT para qualquer usuário autenticado. Escrita restrita ao admin.  
**Índices:** `cities_search_text_idx`, `cities_name_idx`, `cities_state_code_idx`.

---

### lead_searches
Registro de buscas realizadas pelo usuário.

| Campo       | Tipo        |
|-------------|-------------|
| id          | uuid PK     |
| user_id     | uuid        |
| category_id | uuid        | FK → lead_categories |
| city        | text        |
| status      | text        | pending / processing / completed / failed |
| created_at  | timestamptz |
| updated_at  | timestamptz |

---

### lead_search_results
Tabela pivô: associa leads a buscas sem duplicar registros.

| Campo      | Tipo    |
|------------|---------|
| id         | uuid PK |
| search_id  | uuid    | FK → lead_searches |
| lead_id    | uuid    | FK → leads |
| created_at | timestamptz |

---

### templates
Templates de email reutilizáveis.

| Campo      | Tipo        |
|------------|-------------|
| id         | uuid PK     |
| user_id    | uuid        |
| name       | text        |
| subject    | text        |
| body       | text        |
| created_at | timestamptz |
| updated_at | timestamptz |

**Variáveis suportadas:**
- `{{lead_company_name}}`
- `{{user_company_name}}`
- `{{user_name}}`

---

### template_attachments
Anexos vinculados a templates.

| Campo       | Tipo        | Obs             |
|-------------|-------------|-----------------|
| id          | uuid PK     |                 |
| template_id | uuid        | FK → templates  |
| user_id     | uuid        |                 |
| file_path   | text        | path no Storage |
| file_name   | text        |                 |
| file_size   | integer     | bytes           |
| created_at  | timestamptz |                 |

Limites: até 5 anexos por template, 10MB por arquivo. Tipos: PDF, PPT, PPTX.

---

### email_threads
**Implementado.**
Threads de email baseadas em Gmail threads. Representa a conversa/thread do Gmail.

| Campo         | Tipo        |
|---------------|-------------|
| id            | uuid PK     |
| user_id       | uuid        |
| lead_id       | uuid        | FK → leads |
| gmail_thread_id | text      |
| subject       | text        |
| last_reply_at | timestamptz |
| created_at    | timestamptz |
| updated_at    | timestamptz |

---

### email_messages
**Implementado.**
Mensagens individuais da thread, tanto enviadas quanto recebidas.

| Campo            | Tipo        | Obs                                         |
|------------------|-------------|---------------------------------------------|
| id               | uuid PK     |                                             |
| user_id          | uuid        |                                             |
| lead_id          | uuid        | FK → leads                                  |
| thread_id        | uuid        | FK → email_threads                          |
| template_id      | uuid        | FK → templates (nullable)                   |
| subject          | text        |                                             |
| body             | text        |                                             |
| direction        | text        | `inbound` / `outbound`                      |
| gmail_message_id | text        |                                             |
| from_email       | text        | nullable — remetente (respostas inbound)    |
| sent_at          | timestamptz |                                             |
| created_at       | timestamptz |                                             |
| is_read          | boolean     | default false — true quando lida pelo usuário |
| read_at          | timestamptz | nullable — quando foi marcada como lida     |

**Leitura individual:** `markEmailMessageAsRead(supabase, userId, messageId)` — valida ownership via `user_id` antes de atualizar.

**Dashboard futuro:** `read_at` permite separar respostas novas (ainda não lidas) de respostas já visualizadas, útil para métricas de tempo de resposta e taxa de leitura.

---

### followups
Tarefa pendente de controle comercial. Representa acompanhamentos agendados para leads.

| Campo             | Tipo        | Obs                                                          |
|-------------------|-------------|--------------------------------------------------------------|
| id                | uuid PK     |                                                              |
| user_id           | uuid        |                                                              |
| lead_id           | uuid        | FK → leads                                                   |
| title             | text        |                                                              |
| notes             | text        | opcional                                                     |
| due_at            | timestamptz |                                                              |
| status            | text        | `pending` \| `completed` \| `ignored` \| `cancelled`        |
| type              | text        | `manual` (default) \| `no_reply`                            |
| email_message_id  | uuid        | FK → email_messages (nullable) — email que originou o no_reply |
| completed_at      | timestamptz | nullable                                                     |
| created_at        | timestamptz |                                                              |
| updated_at        | timestamptz |                                                              |

**type — valores oficiais:**
- `manual` — criado manualmente pelo usuário na seção de acompanhamentos do lead
- `no_reply` — criado após envio de email; desaparece automaticamente se o lead responder após `created_at`

**Filtragem de no_reply:** app-side — ao buscar pending, acompanhamentos `no_reply` onde `leads.last_reply_at > followup.created_at` são excluídos do resultado sem alterar o status no banco.

---

---

### apify_import_jobs
Rastreia jobs de importação assíncrona via Apify. Cada job representa um run do actor `compass~crawler-google-places`.

| Campo                     | Tipo        | Obs                                                         |
|---------------------------|-------------|-------------------------------------------------------------|
| id                        | uuid PK     |                                                             |
| created_by                | uuid        | FK → profiles (admin que criou)                             |
| category_id               | uuid        | FK → lead_categories (nullable)                             |
| category_name             | text        | snapshot do nome da categoria no momento da criação         |
| city                      | text        | cidade normalizada enviada ao Apify                         |
| requested_limit           | int         | quantidade solicitada (5–200)                               |
| status                    | text        | `pending` \| `running` \| `processing` \| `succeeded` \| `failed` |
| apify_run_id              | text        | ID do run na Apify                                          |
| apify_dataset_id          | text        | defaultDatasetId do run (preenchido após sync)              |
| imported_count            | int         | leads efetivamente inseridos em global_leads                |
| skipped_duplicate_count   | int         | leads ignorados por duplicidade                             |
| email_found_count         | int         | importados com email_found                                  |
| website_only_count        | int         | importados com website_only                                 |
| manual_review_count       | int         | importados com manual_review                                |
| invalid_count             | int         | rows ignorados por company_name vazio                       |
| error_message             | text        | mensagem de erro se status=failed                           |
| payload                   | jsonb       | input enviado ao Apify (sem token)                          |
| created_at                | timestamptz |                                                             |
| updated_at                | timestamptz |                                                             |
| finished_at               | timestamptz | quando o sync foi concluído ou falhou                       |

**Fluxo de status:** `pending` → `running` (após iniciar run) → `processing` (buscando dataset) → `succeeded` / `failed`

RLS: somente admins (via `profiles.role = 'admin'`).

---

## Storage Buckets

| Bucket                   | Uso                        | Visibilidade |
|--------------------------|----------------------------|------|
| `/company-logos`         | Logos das empresas         | público |
| `/company-presentations` | PDFs de apresentação       | privado |
| `/template-attachments`  | Anexos de templates        | privado |

Regra: banco salva apenas o path/url. Arquivo fica no Storage.

## RLS

Todas as tabelas devem ter Row Level Security ativado no Supabase. Cada usuário acessa apenas seus próprios dados via `user_id`.
