Você está ajudando no desenvolvimento de um MVP SaaS de prospecção comercial por email.

# OBJETIVO PRINCIPAL

O sistema ajudará pequenas empresas a:

- organizar prospecção comercial
- buscar leads
- enviar apresentações comerciais
- acompanhar respostas
- controlar follow-ups

O sistema NÃO será um disparador massivo de emails.

O foco principal é:

- organização comercial
- prospecção estruturada
- relacionamento comercial
- acompanhamento de leads

# FILOSOFIA DO MVP

Prioridades:

- simplicidade
- estabilidade
- arquitetura limpa
- modularidade
- clareza
- baixo acoplamento
- desenvolvimento incremental

O sistema deve suportar aproximadamente:

- 3–10 usuários simultâneos no MVP

# NÃO UTILIZAR

Não utilizar:

- microservices
- arquitetura enterprise
- filas complexas
- event sourcing
- automações excessivas
- IA autônoma
- abstrações desnecessárias
- overengineering
- realtime complexo
- infraestrutura distribuída

# STACK OFICIAL

Frontend:
- Next.js
- TypeScript
- Tailwind CSS

Backend:
- Next.js

Banco/Auth/Storage:
- Supabase

Integrações:
- Gmail API + OAuth Google
- Apify

Deploy:
- Vercel

Cron jobs:
- Vercel Cron

Validação:
- Zod

Testes:
- Vitest
- Testing Library

# ESTRATÉGIA DE DESENVOLVIMENTO

O projeto será desenvolvido modularmente.

NÃO gerar o SaaS inteiro de uma vez.

Sempre trabalhar:
- módulo por módulo
- funcionalidade por funcionalidade
- respeitando a arquitetura definida

Sempre priorizar:
- simplicidade
- legibilidade
- organização
- baixo acoplamento

# DOCUMENTAÇÃO DO PROJETO

A pasta /docs será a fonte oficial de contexto do projeto.

Estrutura planejada:

/docs
  project_context.md
  vision.md
  architecture.md
  database.md
  roadmap.md
  features.md
  conventions.md

# OBJETIVO DO project_context.md

O arquivo project_context.md será:

- fonte da verdade do projeto
- memória arquitetural
- alinhamento técnico
- contexto persistente para IA
- registro oficial das decisões arquiteturais

Todos os outros documentos devem ser gerados com base no project_context.md.

# RESPONSABILIDADE DE CADA DOC

## project_context.md

Contém:
- visão geral
- escopo
- stack
- arquitetura
- decisões oficiais
- filosofia do projeto
- limites do MVP
- padrões principais

É a verdade absoluta do projeto.

## vision.md

Contém:
- visão de produto
- objetivo do negócio
- dores resolvidas
- público alvo
- diferenciais
- visão futura

## architecture.md

Contém:
- arquitetura geral
- fluxo do sistema
- módulos
- integrações
- responsabilidades técnicas
- comunicação entre partes

## database.md

Contém:
- tabelas
- relações
- índices
- ownership
- constraints
- RLS
- estratégias do banco

## roadmap.md

Contém:
- ordem de desenvolvimento
- milestones
- fases do MVP
- prioridades

## features.md

Contém:
- funcionalidades detalhadas
- regras de negócio
- fluxos do usuário
- comportamento do sistema

## conventions.md

Contém:
- padrões do projeto
- naming
- estrutura pastas
- services
- repositories
- DTOs
- validações
- error handling

# ARQUITETURA OFICIAL

# AUTH

Utilizar Supabase Auth.

Estrutura:

auth.users
→ profiles
→ company_profiles

Regra oficial:
1 usuário = 1 empresa

# TABELA profiles

Responsável por:
- identidade do usuário
- email
- nome
- avatar

Campos:

- id
- email
- full_name
- avatar_url
- created_at
- updated_at

# TABELA company_profiles

Responsável pelos dados comerciais da empresa.

Campos:

- id
- user_id
- company_name
- description
- city
- phone
- commercial_email
- website
- logo_path
- presentation_pdf_path
- created_at
- updated_at

Regra:
- user_id UNIQUE

# UPLOADS

Arquivos NÃO ficam no banco.

Banco salva apenas:
- path/url

Arquivos ficam no Supabase Storage.

Buckets oficiais:

- /company-logos
- /company-presentations
- /template-attachments

# PADRÕES GLOBAIS DO BANCO

Todas tabelas principais devem utilizar:

- id uuid primary key default gen_random_uuid()
- created_at timestamptz
- updated_at timestamptz

Ownership padrão:

- user_id uuid

# STATUS STRATEGY

NÃO utilizar ENUM PostgreSQL.

Utilizar:
- status text

Validação feita pela aplicação.

# DELETE STRATEGY

NÃO utilizar soft delete global.

Estratégia:
- delete real quando apropriado
- hidden/archive quando necessário

# GMAIL

Tabela:
gmail_connections

Responsável por:
- OAuth Google
- tokens
- sincronização
- status conexão

Estratégia oficial:
- 1 conta Gmail por usuário
- Gmail API oficial
- OAuth Google
- sincronização incremental

Sistema deve sincronizar APENAS:
- emails enviados pelo sistema
- replies dessas threads

NÃO sincronizar:
- inbox inteira
- emails pessoais
- histórico completo Gmail

# REPLIES

Replies serão detectados via polling.

Estratégia:
- cron jobs
- frequência entre 5–15 minutos

# LEADS

Leads pertencem ao usuário.

NÃO existe base global compartilhada.

Tabela:
leads

Campos principais:
- company_name
- contact_name
- email
- phone
- website
- city
- source
- status
- notes
- is_hidden
- hidden_at
- last_contacted_at
- last_reply_at

# STATUS OFICIAIS DOS LEADS

- novo
- contatado
- interessado
- negociacao
- responder_depois
- sem_interesse
- sem_resposta

# LEADS REMOVIDOS

Lead removido NÃO deve reaparecer em futuras buscas.

Utilizar:
- is_hidden
- hidden_at

Mesmo se APIs externas retornarem novamente esse lead.

# DEDUPLICAÇÃO

Lead duplicado se existir:

mesmo:
- user_id + email

OU:
- user_id + website

# CATEGORIAS DE LEADS

Usuário NÃO digita nichos livremente.

Utilizar categorias padronizadas.

Tabela:
lead_categories

Exemplos:
- Restaurantes
- Dentistas
- Academias
- Mercados
- Advogados

# BUSCAS DE LEADS

Tabela:
lead_searches

Tabela pivô:
lead_search_results

Mesmo lead pode existir em múltiplas buscas sem duplicar registros.

# TEMPLATES

Usuário poderá criar templates reutilizáveis.

Tabela:
templates

Campos:
- name
- subject
- body

# VARIÁVEIS OFICIAIS

- {{lead_company_name}}
- {{user_company_name}}
- {{user_name}}

# EDIÇÃO ANTES DO ENVIO

Usuário SEMPRE poderá:
- editar assunto
- editar mensagem
- trocar anexos
antes do envio

# ANEXOS

Tabela:
template_attachments

Tipos permitidos:
- PDF
- PPT
- PPTX

Limites:
- até 5 anexos
- 10MB por arquivo

# EMAILS

Separar:

- email_threads
- sent_emails

Arquitetura baseada em Gmail threads.

Direções:
- inbound
- outbound

# FOLLOWUPS

Sistema NÃO enviará follow-up automático.

Sistema apenas:
- controla tempo
- alerta follow-up pendente
- organiza pendências

Tabela:
followups

Status:
- pending
- completed
- ignored
- cancelled

# LEAD STATUS HISTORY

Tabela:
lead_status_history

Responsável por:
- histórico comercial
- auditoria
- timeline
- métricas futuras

# DASHBOARD

Dashboard simples contendo:

- total leads
- emails enviados
- replies recebidas
- follow-ups pendentes
- leads interessados
- atividades recentes

# ESTRUTURA DE PÁGINAS

/dashboard

/leads
/leads/[id]

/search

/templates
/templates/[id]

/followups

/inbox

/settings
/settings/company
/settings/gmail

# ESTRUTURA DE PASTAS

/src

  /app
  /components
  /features
  /services
  /repositories
  /integrations
  /lib
  /types
  /validations
  /hooks
  /utils
  /emails
  /server

Arquitetura baseada em domínio/features.

Exemplos:

/features/leads
/features/templates
/features/followups

# CONVENÇÕES

Naming:

- camelCase → variáveis/funções
- PascalCase → componentes/types
- kebab-case → rotas
- snake_case → banco

# SERVICES

Responsáveis por:
- regras negócio
- integrações
- lógica sistema

# REPOSITORIES

Responsáveis por:
- queries
- acesso banco
- Supabase

# VALIDAÇÃO

Utilizar:
- Zod

# DTO STRATEGY

Utilizar DTOs simples entre:
- frontend
- backend
- services

# ERROR HANDLING

Padronizar:
- AppError
- code
- message
- status

# TESTES

Priorizar:
- OAuth Gmail
- envio email
- deduplicação
- follow-up
- integrações críticas

# DEPLOY

Frontend/Backend:
- Vercel

Banco/Auth/Storage:
- Supabase

Cron jobs:
- Vercel Cron

# IMPORTANTE

Sempre respeitar:
- simplicidade
- modularidade
- clareza
- baixo acoplamento
- arquitetura do MVP
- evitar complexidade prematura

Nunca adicionar:
- abstrações enterprise desnecessárias
- padrões excessivamente complexos
- tecnologias fora da stack definida
- sistemas genéricos exagerados

Ao gerar qualquer documentação ou código:
- respeitar TODAS as decisões acima
- manter consistência arquitetural
- evitar reinventar decisões já tomadas