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

| Campo      | Tipo        |
|------------|-------------|
| id         | uuid PK     |
| email      | text        |
| full_name  | text        |
| avatar_url | text        |
| created_at | timestamptz |
| updated_at | timestamptz |

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

| Campo         | Tipo        | Obs                     |
|---------------|-------------|-------------------------|
| id            | uuid PK     |                         |
| user_id       | uuid UNIQUE | FK → profiles           |
| email         | text        | conta Gmail conectada   |
| access_token  | text        | temporário, expira rapidamente |
| refresh_token | text        | principal token persistido |
| expires_at    | timestamptz |                         |
| status        | text        | connected / disconnected|
| created_at    | timestamptz |                         |
| updated_at    | timestamptz |                         |

---

### lead_categories
Categorias padronizadas de leads.

| Campo      | Tipo    |
|------------|---------|
| id         | uuid PK |
| name       | text    |
| created_at | timestamptz |

Exemplos: Restaurantes, Dentistas, Academias, Mercados, Advogados.

---

### leads
Leads do usuário.

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
Mensagens individuais da thread, tanto enviadas quanto recebidas.

| Campo          | Tipo        |
|----------------|-------------|
| id             | uuid PK     |
| user_id        | uuid        |
| lead_id        | uuid        | FK → leads |
| thread_id      | uuid        | FK → email_threads |
| template_id    | uuid        | FK → templates (nullable) |
| subject        | text        |
| body           | text        |
| direction      | text        | inbound / outbound |
| gmail_message_id | text      |
| sent_at        | timestamptz |
| created_at     | timestamptz |

---

### followups
Tarefa pendente de controle comercial. Representa follow-ups agendados para leads.

| Campo       | Tipo        |
|-------------|-------------|
| id          | uuid PK     |
| user_id     | uuid        |
| lead_id     | uuid        | FK → leads |
| due_at      | timestamptz |
| status      | text        | pending / completed / ignored / cancelled |
| notes       | text        |
| created_at  | timestamptz |
| updated_at  | timestamptz |

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
