# CALLS_ROADMAP.md — Roadmap de Implementação

**Versão:** 1.0  
**Data:** 2026-06-21  
**Status:** Planejamento

---

## Premissas

- Cada fase deve ser entregável e testável de forma independente
- Nenhuma fase começa sem a anterior estar mergeada em `main`
- Estimativas assumem dedicação parcial (~4h/dia de desenvolvimento)
- "Não implementar ainda" no spec significa excluído das fases abaixo

---

## Fase 1 — Pesquisa e Decisão Técnica

**Status:** ✅ Concluído  
**Entregável:** `docs/calls/DT-CALLS-01.md`

- [x] Comparar WebRTC vs Click-to-Call
- [x] Validar compatibilidade de browsers
- [x] Analisar custo Twilio para Brasil
- [x] Definir stack de IA (Gemini)
- [x] Gerar recomendação técnica
- [x] Documentar arquitetura, banco, roadmap, custos e riscos

---

## Fase 0.5 — Pipeline de Enriquecimento de Leads

**Estimativa:** 3-5 dias  
**Branch:** `feat/lead-enrichment`  
**Prerequisito:** Fase 1 aprovada  
**Referência:** [DT-CALLS-03.md](DT-CALLS-03.md)

> Independente do módulo de Calls em código, mas pré-requisito de negócio: sem enriquecimento, novos leads chegam sem telefone e não podem ser ligados.

### 0.1 Limpeza da base atual
- [ ] Identificar os 5 registros `invalid` (sem email e sem telefone) em `global_leads`
- [ ] Verificar se algum está em `user_leads` antes de alterar
- [ ] Marcar como `status = 'invalid'`

### 0.2 Workflow n8n — Enriquecimento Nível 1 (scraping sem IA)
- [ ] Criar workflow `lead-enrichment-pipeline` no n8n
- [ ] GET website da empresa → extrair emails via regex (`href="mailto:..."`)
- [ ] GET website da empresa → extrair telefones via regex (padrões BR com `+55`)
- [ ] GET páginas de contato comuns (`/contato`, `/fale-conosco`, `/contact`)
- [ ] Repetir extração nessas páginas
- [ ] Se encontrou email OU telefone → salvar e encerrar pipeline

### 0.3 Workflow n8n — Enriquecimento Nível 2 (IA fallback)
- [ ] Acionar Gemini 1.5 Flash apenas quando Nível 1 falhar
- [ ] Prompt: identificar email comercial e telefone a partir do HTML
- [ ] Parse + validação JSON da resposta
- [ ] Salvar se válido

### 0.4 Integração com o Prospecta
- [ ] `POST /api/leads/enrich` — endpoint para n8n enviar resultado de volta
- [ ] Atualizar `global_leads.email` e/ou `global_leads.phone` (campos de contato são mutáveis)
- [ ] Trigger automático para novos lotes importados pelo Apify

### 0.5 Política de publicação no admin
- [ ] Exibir classificação `complete / partial_phone / partial_email / invalid` na tela admin
- [ ] Bloquear aprovação de leads `invalid` (sem nenhum canal)
- [ ] Permitir aprovação de `partial_phone` e `partial_email`

---

## Fase 2 — Infraestrutura Base

**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-infrastructure`  
**Prerequisito:** Fase 1 e 0.5 aprovadas

### 2.1 Banco de dados
- [ ] Migration: criar tabela `telephony_settings`
- [ ] Migration: criar tabela `calls`
- [ ] Migration: criar tabela `call_analyses`
- [ ] Migration: criar tabela `analysis_credits`
- [ ] Configurar RLS em todas as tabelas
- [ ] Criar bucket `call-recordings` no Supabase Storage com políticas

### 2.2 Tipos TypeScript
- [ ] Gerar/atualizar `src/lib/supabase/types.ts` após migrations
- [ ] Criar `src/types/calls.ts` com tipos de domínio

### 2.3 Variáveis de ambiente
- [ ] Adicionar `TELEPHONY_MASTER_KEY` no Vercel (prod e preview)
- [ ] Adicionar `N8N_WEBHOOK_SECRET` no Vercel
- [ ] Adicionar `N8N_CALL_ANALYSIS_WEBHOOK_URL` no Vercel
- [ ] Documentar no `.env.example`

### 2.4 Configurações Twilio (UI)
- [ ] Adicionar seção "Telefonia" na página `/settings`
- [ ] Formulário: Account SID, Auth Token, Número Twilio
- [ ] Criptografar Auth Token antes de salvar (AES-256-GCM)
- [ ] Server Action: `saveTelephonySettingsAction`
- [ ] Server Action: `testTelephonyConnectionAction` (valida credenciais com Twilio API)
- [ ] Indicador: "Configuração válida ✓" ou erro descritivo

---

## Fase 3 — Backend Telefonia

**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-backend`  
**Prerequisito:** Fase 2

### 3.1 Provider Twilio
- [ ] Instalar `@twilio/voice-sdk` e `twilio` (server)
- [ ] Instalar `libphonenumber-js`
- [ ] Criar `src/features/calls/providers/types.ts` (interface `ITelephonyProvider`)
- [ ] Criar `src/features/calls/providers/twilioProvider.ts`
- [ ] Criar `src/features/calls/providers/getProvider.ts`

### 3.2 Route Handlers
- [ ] `POST /api/calls/token` — gera Twilio Access Token
- [ ] `POST /api/calls/twiml` — retorna TwiML + cria registro em `calls`
- [ ] `POST /api/calls/status` — recebe status callbacks do Twilio
- [ ] Validação de assinatura Twilio em `/twiml` e `/status`

### 3.3 Repositório
- [ ] Criar `src/repositories/callRepository.ts`
  - `createCall(dto)`
  - `updateCallStatus(callSid, status, duration?, endedAt?)`
  - `updateCallRecording(callId, recordingSid)`
  - `getCallById(id, userId)`
  - `getCallsByLead(leadId)` / `getCallsByUserLead(userLeadId)`

---

## Fase 4 — Gravação e Transferência

**Estimativa:** 2-3 dias  
**Branch:** `feat/calls-recording`  
**Prerequisito:** Fase 3

### 4.1 Transferência Twilio → Supabase Storage
- [ ] Criar `src/services/callRecordingService.ts`
  - `transferRecording(callId, recordingSid, twilioCredentials)`
  - `deleteExpiredRecordings()`
- [ ] Criar cron: `GET /api/cron/transfer-recordings` (intervalo: 5min)
- [ ] Criar cron: `GET /api/cron/expire-recordings` (intervalo: diário)
- [ ] Configurar crons no `vercel.json`

### 4.2 Controle de expiração
- [ ] `recording_expires_at = ended_at + 15 dias` setado no status callback
- [ ] Cron de expiração deleta do Storage e nula `recording_url`
- [ ] Testar deleção — arquivo não deve ser acessível após expiração

---

## Fase 5 — Interface do Usuário (Ligação)

**Estimativa:** 4-5 dias  
**Branch:** `feat/calls-ui`  
**Prerequisito:** Fase 3

### 5.1 Botão "Ligar" na página do lead
- [ ] Adicionar botão ao lado de "Enviar Email" em `/leads/[id]`
- [ ] Botão desabilitado se: sem telefone no lead, sem `telephony_settings` configurado
- [ ] Tooltip explicativo quando desabilitado ("Configure a telefonia em Configurações")

### 5.2 Componentes
- [ ] `PhoneCallModal.tsx` — modal principal da ligação
  - Exibe número do lead (editável antes de iniciar)
  - Botão "Iniciar Ligação"
  - Estado durante ligação: timer + botão "Encerrar"
  - Estado pós-ligação: "Deseja analisar esta ligação?"
- [ ] `CallTimer.tsx` — timer HH:MM:SS durante ligação ativa
- [ ] `CallStatusIndicator.tsx` — badge de estado (Iniciando... / Conectando... / Em andamento / Encerrada)

### 5.3 Integração com SDK Twilio
- [ ] Instalar `@twilio/voice-sdk` no frontend
- [ ] Hook `usePhoneCall(callId, token)` gerencia lifecycle do Device Twilio
- [ ] Gerenciar estados: idle → connecting → ringing → connected → disconnected
- [ ] Tratamento de erros: microfone negado, token expirado, número inválido

### 5.4 Pós-ligação — Solicitar análise
- [ ] Modal "Análise de IA" exibido ao encerrar
- [ ] Exibir créditos restantes
- [ ] Botão "Analisar" — POST `/api/calls/[id]/request-analysis`
- [ ] Botão "Ignorar" — fecha modal
- [ ] Campo "Adicionar notas" (sempre visível, opcional)

---

## Fase 6 — Pipeline de IA

**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-ai`  
**Prerequisito:** Fase 4 e 5

### 6.1 Sistema de créditos
- [ ] `POST /api/calls/[id]/request-analysis` — valida créditos, deduz atomicamente, cria `call_analyses`
- [ ] Criar `src/repositories/creditRepository.ts`
  - `getCreditsForCurrentPeriod(userId)`
  - `deductCredit(userId)` — UPDATE atômico com verificação de saldo
  - `initializePeriod(userId, plan)` — cria registro mensal se não existir
- [ ] Criar `src/services/creditService.ts`

### 6.2 Endpoint para n8n
- [ ] `POST /api/calls/[id]/analysis` — recebe resultado do n8n
  - Valida `Authorization: Bearer {N8N_WEBHOOK_SECRET}`
  - Salva transcrição, resumo, pontos-chave, objeções, sugestões
  - Atualiza `call_analyses.status = completed`

### 6.3 Configuração n8n
- [ ] Criar workflow n8n: `call-analysis-pipeline`
  1. Webhook trigger (recebe `call_id`, `recording_url`, `user_id`)
  2. Download do áudio (HTTP Request → Supabase Storage)
  3. Upload para Gemini Files API
  4. Prompt de análise (template parametrizado)
  5. Parse da resposta JSON
  6. POST para `/api/calls/[id]/analysis`
- [ ] Documentar como configurar o workflow (passo a passo)
- [ ] Configurar retry em caso de falha (3 tentativas, backoff exponencial)

### 6.4 Adapter de IA
- [ ] Criar `src/features/calls/ai/types.ts`
- [ ] Criar `src/features/calls/ai/geminiAnalyzer.ts`
- [ ] Criar `src/features/calls/ai/getAnalyzer.ts`

### 6.5 Prompt de análise
- [ ] Criar prompt estruturado para análise de chamadas comerciais
- [ ] Formato de resposta: JSON estrito (validado com Zod antes de salvar)
- [ ] Idioma: português brasileiro
- [ ] Incluir instrução explícita: "Nunca sugira ações automáticas"

---

## Fase 7 — Relatório e Integração CRM

**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-crm`  
**Prerequisito:** Fase 6

### 7.1 Componente de relatório de análise
- [ ] `CallAnalysisReport.tsx` — exibe resultado da IA
  - Resumo da conversa
  - Principais pontos (lista)
  - Objeções identificadas (lista com badge)
  - Sugestão de status (com botão "Aplicar")
  - Sugestão de próximo contato (com botão "Criar followup")
  - Transcrição completa (expansível/colapsável)
- [ ] Loading state enquanto análise está processando (polling a cada 5s ou SSE)
- [ ] Estado "Análise não solicitada" quando `call_analyses` não existe

### 7.2 Integração com Timeline
- [ ] Adicionar eventos de ligação em `LeadTimeline.tsx`
  - `call_completed` — "Ligação realizada (X min)"
  - `call_analyzed` — "Análise de IA disponível"
- [ ] Query no timeline server component: join com `calls`

### 7.3 Integração com Followups
- [ ] No `CallAnalysisReport`, botão "Criar followup com sugestão da IA"
- [ ] Pré-preenche `FollowupCreateForm` com dados da sugestão
- [ ] Usuário confirma antes de criar

### 7.4 Integração com Status
- [ ] No `CallAnalysisReport`, botão "Aplicar status sugerido"
- [ ] Chama `updateLeadStatus` / `updateUserLeadStatus` existente
- [ ] IA nunca chama essas funções diretamente

---

## Fase 8 — Dashboard e Métricas

**Estimativa:** 2-3 dias  
**Branch:** `feat/calls-dashboard`  
**Prerequisito:** Fase 7

> Implementar apenas estrutura básica. Métricas avançadas por canal são futuras.

- [ ] Card "Ligações realizadas este mês" no dashboard
- [ ] Card "Créditos de análise restantes"
- [ ] Seção "Histórico de Ligações" na página do lead
- [ ] Filtro por canal no painel de leads (email / ligação / todos)

---

## Resumo de Estimativas

| Fase | Estimativa | Acumulado |
|---|---|---|
| 1 — Pesquisa | ✅ Concluído | — |
| **0.5 — Enriquecimento** | **3-5 dias** | **3-5 dias** |
| 2 — Infraestrutura | 3-4 dias | 6-9 dias |
| 3 — Backend | 3-4 dias | 9-13 dias |
| 4 — Gravação | 2-3 dias | 11-16 dias |
| 5 — UI | 4-5 dias | 15-21 dias |
| 6 — IA | 3-4 dias | 18-25 dias |
| 7 — CRM | 3-4 dias | 21-29 dias |
| 8 — Dashboard | 2-3 dias | 23-32 dias |

**Total estimado: 6-8 semanas** de desenvolvimento a ~4h/dia (revisado após inclusão da Fase 0.5).

---

## Itens Excluídos do Roadmap (Para o Futuro)

- WhatsApp channel
- Reuniões
- Canal principal (`canal_principal`) na modelagem de leads
- Compra de créditos extras (Stripe)
- Análise de áudio em tempo real (Twilio Media Streams)
- Dashboard avançado por canal
- ~~Normalização de telefones existentes em `global_leads`~~ — não necessário (DT-CALLS-02: 100% já válidos)
- Click-to-Call como opção alternativa
- Filtros de canal para usuários (V1 usa distribuição automática 70/30 — ver DT-CALLS-03)
