# Funcionalidades — Prospecta

## Auth

- Login via email/senha (Supabase Auth)
- Login via Google OAuth
- 1 usuário = 1 empresa
- Perfil do usuário: nome, email, avatar
- Dados comerciais da empresa separados em company_profiles

---

## Settings

### /settings/company
- Editar nome da empresa, descrição, cidade, telefone, email comercial, website
- Upload de logo (bucket: /company-logos)
- Upload de PDF de apresentação (bucket: /company-presentations)

### /settings/gmail
- Conectar conta Gmail via OAuth Google
- Ver status da conexão (conectado / desconectado)
- Ver email da conta Gmail conectada
- Desconectar conta Gmail

**Implementado:** Gmail Connection Foundation concluída.
- Fluxo OAuth: GET /api/gmail/connect → Google → GET /api/gmail/callback.
- Estado CSRF protegido por state em cookie httpOnly.
- Tokens armazenados no banco (nunca no frontend).
- Mesma conta do login Prospecta pode ser conectada como Gmail.

---

## Leads

### Listagem — /leads

A aba Leads exibe **duas fontes unificadas** na mesma tabela:

1. **Leads manuais** — criados manualmente pelo usuário (tabela `leads`). Link → `/leads/[id]`.
2. **Leads da busca** — confirmados via `/api/user-leads/confirm` (tabela `user_leads` + `global_leads`). Link → `/leads/global/[id]`.

Filtros disponíveis (GET params, form submit sem JS necessário):
- **Nicho** — select com categorias do banco (`lead_categories`). "Todos os nichos" exibe as duas fontes; uma categoria específica oculta leads manuais (não têm categoria).
- **Cidade** — input de texto, substring match contra `lead.city` (case-insensitive, app-level).

Comportamento:
- Leads ocultos não aparecem (`is_hidden = true` para leads manuais; `hidden = true` para user_leads)
- Botão "Ocultar" disponível para ambas as fontes
- Contagem de leads visível acima da tabela
- Coluna "Nicho" mostra categoria do lead; leads manuais mostram "Sem categoria"
- Coluna "Contato" disponível apenas para leads manuais

### Detalhe de lead manual — /leads/[id]
- Ver todos os dados do lead
- Editar dados do lead (empresa, contato, email, telefone, site, cidade, status, observações)
- Ver emails enviados ao lead e histórico de threads
- Ver e criar follow-ups do lead
- Alterar status do lead
- Enviar email ao lead

### Detalhe de lead da busca — /leads/global/[id]
- Dados somente-leitura do lead global: empresa, email, site, telefone, cidade, estado
- Alterar status do lead (user_lead.status)
- Ocultar lead (user_leads.hidden = true)
- Sem funcionalidade de email ou follow-up (FKs ainda vinculadas à tabela `leads` — DT-L3)

### Adicionar lead manual — /leads/new
- Formulário de criação manual de lead
- Campos: empresa, contato, email, telefone, site, cidade, observações
- Deduplicação: impede criar lead com mesmo email ou website já existente

### Deduplicação
- Lead duplicado detectado por: mesmo user_id + email OU mesmo user_id + website
- Sistema impede criação de lead duplicado
- Deduplicação por email implementada no create de lead
- Débito técnico: aplicar deduplicação também no updateLeadAction

### Status dos Leads
- `novo` — recém adicionado
- `contatado` — email enviado
- `interessado` — demonstrou interesse
- `negociacao` — em negociação
- `responder_depois` — aguardando momento certo
- `sem_interesse` — descartado
- `sem_resposta` — emails enviados sem resposta

### Leads Ocultos
- Leads manuais: `is_hidden = true` + `hidden_at` na tabela `leads`
- Leads da busca: `hidden = true` na tabela `user_leads`
- Leads ocultos nunca reaparecem na listagem

---

## Templates

### Listagem — /templates
- Listar templates do usuário

### Detalhe/Edição — /templates/[id]
- Criar e editar templates
- Campos: nome, assunto, corpo
- Suporte a variáveis dinâmicas:
  - `{{lead_company_name}}`
  - `{{user_company_name}}`
  - `{{user_name}}`
- Gerenciar anexos (PDF, PPT, PPTX)
  - Até 5 anexos por template
  - Até 10MB por arquivo

---

## Envio de Email

### Fluxo completo
1. Usuário acessa um lead → clica "Enviar email"
2. Seleciona um template na página /leads/[id]/send
3. Sistema substitui variáveis automaticamente (client-side)
4. Usuário pode editar: assunto e corpo antes de enviar
5. Usuário clica "Enviar email"
6. Sistema envia via Gmail API (raw RFC2822, base64url)
7. Sistema registra email_threads e email_messages no banco
8. Status do lead atualizado para `contatado` e last_contacted_at atualizado

**Implementado:** Email Send Foundation concluída.
- Variáveis: {{lead_company_name}}, {{user_company_name}}, {{user_name}}
- Renderização client-side antes da edição final
- Persistência em email_threads + email_messages
- Token expirado detectado com mensagem para reconectar
- Débito técnico: exibir histórico de emails em /leads/[id]

---

## Busca de Leads — /search

**Implementado:** Busca com prévia selecionável — usuário escolhe quais leads adicionar.

### Fluxo completo (usuário comum)

1. Usuário seleciona categoria e cidade
2. Backend retorna até **10 leads como prévia** (sem criar `user_leads`)
3. Usuário seleciona quais quer adicionar via checkboxes
4. Clica em "Adicionar selecionados em Meus Leads"
5. `POST /api/user-leads/confirm` valida e cria os `user_leads` selecionados
6. Leads não selecionados continuam disponíveis no banco global para buscas futuras
7. Sair da tela sem confirmar não consome créditos

### Plano Bronze MVP

- **200 leads/mês** (limite mensal, não diário)
- Até **10 leads por prévia de busca**
- Limite verificado em dois pontos: na prévia (informa restante) e na confirmação (capa e valida)

### Regras da prévia

- `lead_quality_status = email_found`
- `status = active`
- Exclui global_leads já em `user_leads` do usuário (já adicionados)
- Retorna `monthly_remaining` (-1 para admin = ilimitado)

### Confirmação — POST /api/user-leads/confirm

- Recebe `global_lead_ids: string[]` (max 10)
- Valida autenticação, limite mensal, existência e qualidade dos leads (`status=active`, `lead_quality_status=email_found`)
- Pula leads já em `user_leads` (evita violação da constraint UNIQUE)
- Capa ao limite disponível (não rejeita — adiciona o que couber)
- Retorna `{ added, already_owned, monthly_remaining }`
  - `added` — quantos foram efetivamente criados
  - `already_owned` — quantos já estavam em `user_leads` e foram ignorados
  - `monthly_remaining` — créditos restantes após a operação (-1 para admin)

### Admin

- Sem limite mensal (`monthly_remaining = -1`)
- Vê até 50 leads por prévia
- Não filtra leads já vistos (pode rever os mesmos leads a cada busca)
- Pode usar o confirm endpoint sem restrições de limite

### Cidade autocomplete

- Campo livre substituído por autocomplete
- `GET /api/cities?q=` — debounce 250ms no cliente
- Busca por `name ILIKE` e `search_text ILIKE` (normalizado sem acentos)
- Usuário deve selecionar da lista — campo livre não é aceito

### Categoria dinâmica

- Categorias não são hardcoded
- Vêm da tabela `lead_categories` — **5 categorias oficiais do MVP:**
  - Metalúrgica
  - Indústria Plástica
  - Construção Civil
  - Restaurantes
  - Consultórios Médicos
- Backend valida categoria informada contra o banco antes de processar

---

## Acompanhamentos — /followups

- Listar acompanhamentos pendentes do usuário
- Acompanhamento tem: lead, prazo (due_at), status, notas, **tipo** e (opcional) referência ao email
- Status: pending / completed / ignored / cancelled
- **Tipos:**
  - `manual` — criado manualmente na seção de acompanhamentos do lead
  - `no_reply` — criado automaticamente após envio de email; sinaliza que o lead não respondeu
- Sistema NÃO envia acompanhamento automático
- Sistema alerta quando acompanhamento está pendente ou atrasado

### Fluxo pós-envio de email

1. Usuário envia email → sistema salva o email e retorna tela de confirmação
2. Sistema exibe prompt: "Criar acompanhamento caso o lead não responda?"
   - **Lembrar em 2 dias** — cria acompanhamento `no_reply` com prazo em 2 dias às 9h
   - **Lembrar em 5 dias** — cria acompanhamento `no_reply` com prazo em 5 dias às 9h
   - **Escolher data** — exibe seletor de data/hora e cria após confirmação
   - **Não criar** — navega direto para o lead sem criar acompanhamento
3. Acompanhamento `no_reply` criado com:
   - `title: "Verificar resposta ao email enviado"`
   - `email_message_id` referenciando o email enviado
   - `status: pending`

### Filtragem inteligente de no_reply

Acompanhamentos `no_reply` são automaticamente ocultados (sem marcar como concluído) quando o lead já respondeu após a criação do acompanhamento. A regra é aplicada app-side nos repositórios:

- `leads.last_reply_at > followup.created_at` → ocultar o acompanhamento
- Impacta: `/followups` page e dashboard "Próximos acompanhamentos"

### Dashboard — Próximos acompanhamentos

Para acompanhamentos `no_reply`, o card exibe:
- Badge "Sem resposta" (âmbar)
- Label "Verificar resposta ao último email"
- Ação **Enviar novo email** → `/leads/[id]/send`
- Ação **Esquecer lead** → cancela o acompanhamento e atualiza status do lead para `sem_resposta`

### Exibição no detalhe do lead

Seção Acompanhamentos diferencia o tipo com badge:
- "Sem resposta" (âmbar) para `no_reply`
- "Manual" (cinza) para `manual`

---

## Inbox — /inbox

- Exibe replies recebidas de leads
- Sincronização via polling (Vercel Cron, 5–15 min)
- Sistema sincroniza APENAS:
  - Emails enviados pelo sistema
  - Replies nessas threads
- Sistema NÃO sincroniza inbox completa do Gmail
- Ao detectar reply: atualiza last_reply_at do lead e do thread

### Leitura de respostas — /leads/[id]

- Badge "Respostas recebidas N" no header do detalhe do lead — exibe apenas respostas `is_read = false`
- Clicar abre modal centralizado com lista das respostas não lidas
- Cada resposta mostra: "Lead respondeu ao email", data/hora, assunto (truncado), botão "Abrir no Gmail"
- Botão "Marcar como lida": remove visualmente da lista (otimístico), persiste `is_read = true` + `read_at` no banco via `markSingleReplyAsReadAction`
- Quando todas marcadas como lidas: modal fecha automaticamente, botão volta a "Sem respostas"
- Corpo do email não é exibido em nenhum momento no modal
- Timeline (`LeadTimeline`) continua exibindo todas as respostas (lidas e não lidas), sem corpo

---

## Admin — /admin

**Implementado.** Somente usuários com `profiles.role = 'admin'`. Não-admin é redirecionado para `/dashboard`.

### Painel Admin — /admin

Suporta filtros via GET params (`category` slug, `city` texto). Form submit sem JS necessário.

- **Lead Quality Overview:** 4 cards — Email Found / Website Only / Manual Review / Invalid (contagens de `global_leads`)
- **Leads por Nicho:** tabela com total, email_found, website_only, manual_review, invalid por categoria — categorias dinâmicas do banco, sem hardcode
- **Leads sem Email:** tabela dos 50 leads mais recentes com `lead_quality_status = manual_review` OR `website_only` — com link "Adicionar email" para cada lead
- **Global Leads:** até 50 leads filtráveis por nicho e cidade (empresa, nicho, cidade, UF, email, qualidade, status) — filtros via form GET, limpar filtros disponível
- **Categorias:** todas as categorias cadastradas (nome, slug, search_terms)
- **Usuários:** últimos 20 usuários cadastrados (email, role, data)
- Botão "Importar Leads" → `/admin/import`

### Import Apify Assíncrono — /admin/import-apify

**Implementado.** Importação de leads diretamente da Apify com fluxo assíncrono.

Fluxo:
1. Admin seleciona nicho, cidade e quantidade (5–200, default 200)
2. Confirmação visual antes de iniciar
3. `POST /api/admin/import-apify` inicia run assíncrono na Apify e cria registro em `apify_import_jobs` — retorna imediatamente
4. Admin vê o job na lista "Importações Recentes"
5. Clica "Atualizar status" → `POST /api/admin/import-apify/jobs/[id]/sync`:
   - Consulta status do run na Apify
   - Se SUCCEEDED: busca dataset, aplica dedup e classifyLeadQuality, insere em global_leads
   - Atualiza contadores e status do job
6. Job marcado como `succeeded` com resumo de importados / duplicatas / qualidade

**Actor:** `compass~crawler-google-places` com `scrapeContacts: true` e `website: withWebsite`  
**Dedup:** placeId → website → company_name + city  
**Débito técnico:** sync automático via Vercel Cron (DT-APIFY1)

### Import Leads — /admin/import

**Implementado:** intake manual de exportações Apify.

Fluxo:
1. Admin seleciona categoria obrigatória (select, vem do banco)
2. Admin faz upload de arquivo `.json` ou `.csv` exportado do Apify
3. Preview mostra 20 primeiros rows (empresa, cidade, estado, site, telefone, email)
4. Botão "Importar N leads" habilitado somente se categoria selecionada
5. POST `/api/admin/import` processa:
   - Valida `category_id` existe no banco
   - Dedup: company_name + city → skip se já existe
   - `classifyLeadQuality({ email, website })` → `lead_quality_status`
   - `createGlobalLead` com `provider_source: 'apify'` e `category_id` selecionado
6. Resumo final: Importados / Ignorados (duplicata) / Inválidos / Email Found / Website Only / Manual Review

**Campo `category` do arquivo Apify é ignorado** — admin escolhe a categoria explicitamente.  
**Limite:** 500 rows por upload.

### Detalhe de Lead Global — /admin/global-leads/[id]

**Implementado.** Página de detalhe de qualquer lead do banco global, acessível apenas por admins.

- Exibe todos os dados do lead: empresa, email, site, telefone, cidade, estado, categoria, status, qualidade, fonte, data de importação
- Formulário para adicionar ou editar email manualmente
- Ao salvar email: `lead_quality_status` → `email_found`, `status` → `active` — lead fica imediatamente disponível nas buscas dos usuários
- Acessível via link "Adicionar email" na fila "Leads sem Email" ou clicando no nome na tabela Global Leads
- Validação server-side: admin obrigatório, formato de email, existência do lead

### Lead Quality Pipeline

**Implementado.** Classificação automática de qualidade de lead.

- `classifyLeadQuality({ email, website })` em `src/utils/classifyLeadQuality.ts`
- Aplicado em todo `createGlobalLead`: no import manual e no provider (quando ativo)
- Migration `20240113000000` backfilla rows existentes

---

## Dashboard — /dashboard

- Total de leads cadastrados
- Total de emails enviados
- Total de replies recebidas
- Follow-ups pendentes
- Leads com status `interessado`
- Atividades recentes (últimos emails, replies, follow-ups)
