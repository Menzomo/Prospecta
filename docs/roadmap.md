# Roadmap — Prospecta MVP

## Estratégia

Desenvolvimento modular, incremental, módulo por módulo. Nunca implementar tudo de uma vez.

---

## Fase 0 — Fundação

- [x] Definição do project_context.md
- [x] Estrutura de pastas
- [x] Documentação base (/docs)
- [x] Setup do Next.js com TypeScript e Tailwind
- [ ] Setup do Supabase (projeto, auth, storage)
- [ ] Configuração do ESLint
- [ ] Configuração do Vitest
- [ ] Deploy inicial na Vercel

---

## Fase 1 — Auth e Perfil

- [ ] Supabase Auth com OAuth Google
- [ ] Tabelas: profiles, company_profiles
- [ ] Página de login
- [ ] Onboarding: cadastro de dados da empresa
- [ ] Upload de logo e PDF de apresentação
- [ ] Settings: /settings/company

---

## Fase 2 — Leads

- [ ] Tabelas: leads, lead_categories, lead_status_history
- [ ] CRUD manual de leads
- [ ] Listagem com filtros (status, cidade, categoria)
- [ ] Detalhe do lead: /leads/[id]
- [ ] Histórico de status do lead
- [ ] Ocultação de leads (is_hidden)

Nota: Leads Foundation concluída — CRUD básico de leads funcionando (criar, listar, editar e ocultar).
- Deduplicação por email já implementada no create.
- RLS validado manualmente para leads.
- Débito técnico futuro: aplicar deduplicação também no updateLeadAction.

---

## Fase 3 — Templates

- [x] Tabelas: templates
- [x] CRUD de templates (criar, listar, editar, excluir)
- [x] Suporte a variáveis: {{lead_company_name}}, {{user_company_name}}, {{user_name}}
- [ ] Upload de anexos (PDF, PPT, PPTX)
- [ ] Preview do template

Nota: Templates Foundation concluída — CRUD básico de templates funcionando (criar, listar, editar e excluir).
- Variáveis disponíveis exibidas como dica na interface do editor.
- RLS com políticas por user_id.

---

## Fase 4 — Gmail

- [x] OAuth Google para Gmail
- [x] Tabela: gmail_connections
- [x] Conexão e desconexão da conta Gmail
- [x] Settings: /settings/gmail
- [ ] Envio de email via Gmail API
- [ ] Registro de email_threads e email_messages

Nota: Gmail Connection Foundation concluída — conexão OAuth implementada.
- Fluxo: /api/gmail/connect → Google OAuth → /api/gmail/callback → salva gmail_connections.
- CSRF protegido via state parameter em cookie httpOnly.
- Tokens (access_token, refresh_token) salvos no banco, nunca expostos no frontend.
- Desconexão via server action (marca is_connected=false, salva disconnected_at).
- Env vars necessárias: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.

---

## Fase 5 — Envio de Email

- [ ] Fluxo de envio: lead → template → edição → confirmação → envio
- [ ] Substituição de variáveis antes do envio
- [ ] Edição de assunto, corpo e anexos antes do envio
- [ ] Registro de email_messages e email_threads

---

## Fase 6 — Busca de Leads

- [ ] Integração com Apify
- [ ] Tabelas: lead_searches, lead_search_results
- [ ] Página /search com filtro por categoria e cidade
- [ ] Deduplicação de leads
- [ ] Importação de resultados para leads

---

## Fase 7 — Follow-ups

- [ ] Tabela: followups
- [ ] Criação de follow-up por lead
- [ ] Listagem de follow-ups pendentes
- [ ] Página /followups
- [ ] Alertas de follow-up atrasado

---

## Fase 8 — Inbox e Sincronização

- [ ] Polling de replies via Vercel Cron (5–15 min)
- [ ] Detecção de replies em threads ativas
- [ ] Atualização de status do lead ao receber reply
- [ ] Página /inbox com replies recebidas

---

## Fase 9 — Dashboard

- [ ] Página /dashboard
- [ ] Total de leads
- [ ] Emails enviados
- [ ] Replies recebidas
- [ ] Follow-ups pendentes
- [ ] Leads interessados
- [ ] Atividades recentes

---

## Pós-MVP (futuro)

- Multiusuário por empresa
- Mais fontes de busca de leads
- Relatórios avançados
- Notificações push/email
- Métricas por template
