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
- Listar leads do usuário com filtros:
  - status
  - cidade
  - categoria
- Leads ocultos (is_hidden = true) não aparecem na listagem
- Ação para ocultar lead da listagem

### Detalhe — /leads/[id]
- Ver todos os dados do lead
- Editar dados do lead
- Ver histórico de status (lead_status_history)
- Ver emails enviados ao lead
- Ver follow-ups do lead
- Alterar status do lead
- Criar follow-up
- Enviar email ao lead

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
- Lead ocultado não reaparece em buscas futuras via Apify
- Campos: is_hidden, hidden_at

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

**Implementado:** Search consome Banco Global (não chama provider externo).

- Usuário seleciona categoria (lista dinâmica da tabela `lead_categories`)
- Usuário informa cidade via autocomplete (tabela `cities`, 20 cidades seedadas)
- Backend valida categoria e cidade contra o banco
- Sistema busca `global_leads` disponíveis:
  - `category_id` = categoria selecionada
  - `city ILIKE` cidade selecionada
  - `status = active`
  - `lead_quality_status = email_found`
  - Exclui global_leads já vinculados ao usuário via `user_leads`
- Cria `user_leads` para cada lead entregue
- Limite diário: 5 leads por usuário por dia UTC
- Se não houver leads disponíveis: mensagem "Nenhum lead disponível para essa categoria e cidade no momento."
- Deduplicação garantida por `UNIQUE (user_id, global_lead_id)` — nunca entrega o mesmo lead duas vezes

### Cidade autocomplete

- Campo livre substituído por autocomplete
- `GET /api/cities?q=` — debounce 250ms no cliente
- Busca por `name ILIKE` e `search_text ILIKE` (normalizado sem acentos)
- Usuário deve selecionar da lista — campo livre não é aceito

### Categoria dinâmica

- Categorias não são hardcoded
- Vêm da tabela `lead_categories` (22 seedadas)
- Backend valida categoria informada contra o banco antes de processar

---

## Follow-ups — /followups

- Listar follow-ups pendentes do usuário
- Follow-up tem: lead, prazo (due_at), status e notas
- Status: pending / completed / ignored / cancelled
- Sistema NÃO envia follow-up automático
- Sistema alerta quando follow-up está pendente ou atrasado
- Usuário marca follow-up como completed ou ignored

---

## Inbox — /inbox

- Exibe replies recebidas de leads
- Sincronização via polling (Vercel Cron, 5–15 min)
- Sistema sincroniza APENAS:
  - Emails enviados pelo sistema
  - Replies nessas threads
- Sistema NÃO sincroniza inbox completa do Gmail
- Ao detectar reply: atualiza last_reply_at do lead e do thread

---

## Admin — /admin

**Implementado.** Somente usuários com `profiles.role = 'admin'`. Não-admin é redirecionado para `/dashboard`.

### Painel Admin — /admin

- **Lead Quality Overview:** 4 cards — Email Found / Website Only / Manual Review / Invalid (contagens de `global_leads`)
- **Manual Review Queue:** tabela dos 20 leads mais recentes com `lead_quality_status = manual_review`
- **Global Leads:** últimos 20 leads do banco global (empresa, cidade, estado, email, status, score)
- **Categorias:** todas as categorias cadastradas (nome, slug, search_terms)
- **Usuários:** últimos 20 usuários cadastrados (email, role, data)
- Botão "Importar Leads" → `/admin/import`

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
