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

**Status:** ✅ Concluído (exceto 2.3 env vars e `testTelephonyConnectionAction`)  
**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-infrastructure`  
**Prerequisito:** Fase 1 e 0.5 aprovadas

### 2.1 Banco de dados
- [x] Migration: criar tabela `telephony_settings`
- [x] Migration: criar tabela `calls`
- [x] Migration: criar tabela `call_analyses`
- [x] Migration: criar tabela `analysis_credits`
- [x] Configurar RLS em todas as tabelas
- [x] Criar bucket `call-recordings` no Supabase Storage com políticas

### 2.2 Tipos TypeScript
- [x] Gerar/atualizar `src/lib/supabase/types.ts` após migrations
- [x] Criar `src/types/calls.ts` com tipos de domínio

### 2.3 Variáveis de ambiente
- [ ] Adicionar `TELEPHONY_MASTER_KEY` no Vercel (prod e preview)
- [ ] Adicionar `N8N_WEBHOOK_SECRET` no Vercel
- [ ] Adicionar `N8N_CALL_ANALYSIS_WEBHOOK_URL` no Vercel
- [ ] Documentar no `.env.example`

### 2.4 Configurações Twilio (UI)
- [x] Adicionar seção "Telefonia" na página `/settings`
- [x] Formulário: Account SID, Auth Token, Número Twilio
- [x] Criptografar Auth Token antes de salvar (AES-256-GCM)
- [x] Server Action: `saveTelephonySettingsAction`
- [ ] Server Action: `testTelephonyConnectionAction` (valida credenciais com Twilio API)
- [ ] Indicador: "Configuração válida ✓" ou erro descritivo

---

## Fase 3 — Backend Telefonia

**Status:** ✅ Concluído  
**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-backend`  
**Prerequisito:** Fase 2

### 3.1 Provider Twilio
- [x] Instalar `@twilio/voice-sdk` e `twilio` (server)
- [x] Instalar `libphonenumber-js`
- [x] Criar `src/lib/telephony/ITelephonyProvider.ts` (interface `ITelephonyProvider`)
- [x] Criar `src/lib/telephony/twilioProvider.ts`
- [x] Criar `src/lib/telephony/factory.ts`

### 3.2 Route Handlers
- [x] `POST /api/calls/token` — gera Twilio Access Token
- [x] `POST /api/calls/twiml` — retorna TwiML + cria registro em `calls`
- [x] `POST /api/calls/status` — recebe status callbacks do Twilio
- [x] Validação de assinatura Twilio em `/twiml` e `/status`

### 3.3 Repositório
- [x] Criar `src/repositories/callRepository.ts`
  - [x] `createCall(dto)`
  - [x] `updateCallStatus(callSid, status, duration?, endedAt?)`
  - [x] `updateCallRecording(callId, storagePath)`
  - [x] `getCallById(id, userId)`
  - [x] `getCallsByLead(leadId)` / `getCallsByUserLead(userLeadId)`

---

## Fase 4 — Gravação e Transferência

**Status:** ✅ Concluído (falta apenas teste manual de deleção)  
**Estimativa:** 2-3 dias  
**Branch:** `feat/calls-recording`  
**Prerequisito:** Fase 3

### 4.1 Transferência Twilio → Supabase Storage
- [x] Criar `src/services/callRecordingService.ts`
  - [x] `transferPendingRecordings()` — query por `recording_sid IS NOT NULL AND recording_url IS NULL`; download via fetch; upload Storage; deleta Twilio
  - [x] `expireOldRecordings()` — remove Storage; nula `recording_url`; seta `recording_deleted_at`
- [x] Criar cron: `GET /api/cron/transfer-recordings` (intervalo: 5min)
- [x] Criar cron: `GET /api/cron/expire-recordings` (intervalo: diário)
- [x] Configurar crons no `vercel.json`

### 4.2 Controle de expiração
- [x] `recording_expires_at = ended_at + 15 dias` setado no status callback
- [x] Cron de expiração deleta do Storage e nula `recording_url`
- [ ] Testar deleção — arquivo não deve ser acessível após expiração

---

## Fase 5 — Interface do Usuário (Ligação)

**Status:** ✅ Concluído  
**Estimativa:** 4-5 dias  
**Branch:** `feat/calls-ui`  
**Prerequisito:** Fase 3

### 5.1 Botão "Ligar" na página do lead
- [x] Adicionar botão ao lado de "Enviar Email" em `/leads/[id]` e `/leads/global/[id]`
- [x] Botão desabilitado se: sem telefone no lead, sem `telephony_settings` configurado
- [x] Tooltip explicativo quando desabilitado ("Configure a telefonia em Configurações")

### 5.2 Componentes
- [x] `PhoneCallModal.tsx` — modal principal da ligação
  - [x] Exibe número do lead (editável antes de iniciar)
  - [x] Botão "Iniciar Ligação"
  - [x] Estado durante ligação: timer + botão "Encerrar"
  - [x] Estado pós-ligação: "Deseja analisar esta ligação?"
- [x] `CallTimer.tsx` — timer HH:MM:SS durante ligação ativa
- [x] `CallStatusIndicator.tsx` — badge de estado (Iniciando... / Conectando... / Em andamento / Encerrada)

### 5.3 Integração com SDK Twilio
- [x] Instalar `@twilio/voice-sdk` no frontend
- [x] Hook `usePhoneCall` gerencia lifecycle do Device Twilio com `clientCallId` pattern
- [x] Gerenciar estados: idle → connecting → ringing → in-progress → ended
- [x] Tratamento de erros: microfone negado, token expirado, número inválido

### 5.4 Pós-ligação — Solicitar análise
- [x] Prompt "Analisar conversa com IA?" exibido ao encerrar
- [x] Exibir créditos restantes
- [x] Botão "Analisar" — POST `/api/calls/[id]/request-analysis`
- [x] Botão "Ignorar" — dispensa o prompt sem consumir crédito
- [x] Campo "Adicionar notas" (sempre visível, opcional)

---

## Fase 6 — Pipeline de IA

**Status:** 🔄 Em andamento — código backend completo; falta configurar n8n e adapter de IA  
**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-ai`  
**Prerequisito:** Fase 4 e 5

### 6.1 Sistema de créditos
- [x] `POST /api/calls/[id]/request-analysis` — valida créditos, deduz atomicamente, cria `call_analyses`, dispara n8n
- [x] Criar `src/repositories/analysisCreditRepository.ts`
  - [x] `getCurrentPeriodCredits(userId)`
  - [x] `deductCredit(userId)` — via função SQL atômica `deduct_analysis_credit`
  - [x] `initializePeriodCredits(userId, plan, total)` — upsert do período mensal
- [ ] Criar `src/services/creditService.ts` (lógica atualmente em `callService.ts`)

### 6.2 Endpoint para n8n
- [x] `POST /api/calls/[id]/analysis` — recebe resultado do n8n
  - [x] Valida `Authorization: Bearer {N8N_WEBHOOK_SECRET}`
  - [x] Salva transcrição, resumo, pontos-chave, objeções, sugestões
  - [x] Atualiza `call_analyses.status = completed`
- [x] `GET /api/calls/[id]/analysis` — polling de status pelo browser
- [x] `GET /api/calls/[id]` — busca dados de uma chamada pelo browser

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

**Status:** ✅ Concluído  
**Estimativa:** 3-4 dias  
**Branch:** `feat/calls-crm`  
**Prerequisito:** Fase 6

### 7.1 Componente de relatório de análise
- [x] `CallAnalysisReport.tsx` — exibe resultado da IA
  - Resumo da conversa
  - Principais pontos (lista)
  - Objeções identificadas (lista com badge)
  - Sugestão de status (com botão "Aplicar")
  - Sugestão de próximo contato (com botão "Criar followup")
  - Transcrição completa (expansível/colapsável)
- [x] Loading state enquanto análise está processando (spinner + botão "Atualizar")
- [x] Estado "Análise não solicitada" quando `call_analyses` não existe

### 7.2 Integração com Timeline
- [x] Adicionar eventos de ligação em `LeadTimeline.tsx`
  - `call_completed` — "Ligação realizada (X min)"
  - `call_analyzed` — "Análise de IA disponível"
- [x] Query no timeline server component: join com `calls` via `getCallsWithAnalysisByLeadId`

### 7.3 Integração com Followups
- [x] No `CallAnalysisReport`, botão "Criar followup com sugestão da IA"
- [x] Pré-preenche `FollowupCreateForm` com `defaultTitle`, `defaultNotes`, `defaultDaysFromNow`
- [x] Usuário confirma antes de criar

### 7.4 Integração com Status
- [x] No `CallAnalysisReport`, botão "Aplicar status sugerido"
- [x] `applyCallSuggestedStatusAction` em `calls/actions.ts` — trata `leadId` e `userLeadId`
- [x] IA nunca chama essas funções diretamente

---

## Fase 8 — Dashboard e Métricas

**Status:** ✅ Concluído (estrutura básica)  
**Estimativa:** 2-3 dias  
**Branch:** `feat/calls-dashboard`  
**Prerequisito:** Fase 7

> Implementar apenas estrutura básica. Métricas avançadas por canal são futuras.

- [x] Card "Ligações realizadas este mês" no dashboard (`getCallsThisMonthCount`)
- [x] Card "Créditos de análise restantes" com barra de progresso e badge "BAIXO" quando ≤ 2
- [x] Seção "Histórico de Ligações" na página do lead (entregue na Fase 7 — `LeadCallsSection`)
- [ ] Filtro por canal no painel de leads (email / ligação / todos) — futuro

---

## Resumo de Estimativas

| Fase | Estimativa | Status |
|---|---|---|
| 1 — Pesquisa | — | ✅ Concluído |
| 0.5 — Enriquecimento | 3-5 dias | 🔄 Parcial (endpoint + admin UI feitos; n8n workflow pendente) |
| 2 — Infraestrutura | 3-4 dias | ✅ Concluído (exceto env vars e test connection) |
| 3 — Backend | 3-4 dias | ✅ Concluído |
| 4 — Gravação | 2-3 dias | ✅ Concluído |
| 5 — UI | 4-5 dias | ✅ Concluído |
| 6 — IA | 3-4 dias | 🔄 Em andamento (código done; n8n + adapter pendentes) |
| **7 — CRM** | **3-4 dias** | **✅ Concluído** |
| 8 — Dashboard | 2-3 dias | ✅ Concluído |

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
