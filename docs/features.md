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
1. Usuário acessa um lead
2. Seleciona ou cria um template
3. Sistema substitui variáveis automaticamente
4. Usuário pode editar: assunto, corpo e anexos antes de enviar
5. Usuário confirma envio
6. Sistema envia via Gmail API
7. Sistema registra email_threads e email_messages no banco
8. Status do lead atualizado para `contatado`

---

## Busca de Leads — /search

- Usuário seleciona categoria padronizada (ex: Restaurantes)
- Usuário informa cidade
- Sistema aciona Apify
- Resultados retornam e são exibidos
- Deduplicação aplicada antes de salvar
- Leads ocultos não são reimportados
- Usuário pode importar leads selecionados

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

## Dashboard — /dashboard

- Total de leads cadastrados
- Total de emails enviados
- Total de replies recebidas
- Follow-ups pendentes
- Leads com status `interessado`
- Atividades recentes (últimos emails, replies, follow-ups)
