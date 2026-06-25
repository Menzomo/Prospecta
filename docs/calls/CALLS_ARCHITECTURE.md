# CALLS_ARCHITECTURE.md — Arquitetura do Módulo de Ligações

**Versão:** 1.0  
**Data:** 2026-06-21  
**Status:** Planejamento (não implementado)

---

## Visão Geral

O módulo de ligações adiciona o canal de telefonia ao Prospecta sem substituir os fluxos existentes de email. A arquitetura é desenhada para:

- Reutilizar os padrões já estabelecidos (Timeline, Followups, Status, dual lead_id/user_lead_id)
- Ser independente da infraestrutura de email
- Suportar troca futura de provedor de telefonia
- Processar IA de forma assíncrona (não bloqueante)

---

## Stack Técnico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend WebRTC | `@twilio/voice-sdk` | SDK oficial, suporte ativo, WebRTC abstraído |
| Backend TwiML | Next.js Route Handlers (`/api/calls/*`) | Alinhado com o padrão atual do projeto |
| Provedor de telefonia | Twilio (conta do usuário) | Primeiro provedor; arquitetura permite troca |
| Armazenamento de gravação | Supabase Storage (bucket `call-recordings`) | Controle de retenção; evita dependência de URL Twilio |
| Orquestração de IA | n8n (self-hosted ou cloud) | Desacoplamento; fluxos editáveis sem deploy |
| IA de análise | Gemini 1.5 Flash (via n8n) | Custo menor; arquitetura suporta troca de modelo |
| Criptografia de credenciais | AES-256-GCM (Web Crypto API nativa) | Sem dependência extra; Auth Token Twilio nunca exposto em plaintext |
| Parsing de telefone | `libphonenumber-js` | Normalização E.164 obrigatória para Twilio |

---

## Diagrama de Fluxo — Ligação Completa

```
[Lead Page — Browser]
    |
    | 1. Clica "Ligar"
    v
[Modal de Ligação]
    |
    | 2. POST /api/calls/token  (gera Twilio Access Token)
    v
[API Route: /api/calls/token]
    |— Lê telephony_settings do usuário (descriptografa Auth Token)
    |— Cria AccessToken com VoiceGrant para o TwiML App
    |— Retorna { token, identity }
    |
    | 3. SDK inicializa com token
    v
[Twilio Voice SDK — Browser]
    |
    | 4. device.connect({ params: { To: "+5511999999999", CallId: "uuid" } })
    v
[Twilio Cloud]
    |— Chama TwiML App webhook: POST /api/calls/twiml
    |
    | 5. Gera TwiML com <Dial> + <Record>
    v
[API Route: /api/calls/twiml]
    |— Valida assinatura Twilio
    |— Retorna TwiML: <Response><Dial record="record-from-start"><Number>...
    |— Cria registro na tabela `calls` (status: initiated)
    |
    | 6. Twilio conecta com o lead
    v
[Ligação ativa — browser mostra timer]
    |
    | 7. Usuário clica "Encerrar"
    v
[Twilio encerra chamada]
    |
    | 8. Status Callback: POST /api/calls/status
    v
[API Route: /api/calls/status]
    |— Valida assinatura Twilio
    |— Atualiza calls.status, duration_seconds, ended_at, recording_sid
    |— Dispara transferência de gravação (background job)
    |
    | 9. Browser recebe evento "disconnect" do SDK
    v
[Modal: "Deseja analisar esta ligação?"]
    |
    | 10a. Usuário clica "Analisar"
    v
[POST /api/calls/[id]/request-analysis]
    |— Verifica créditos disponíveis
    |— Deduz 1 crédito atomicamente
    |— Cria registro call_analyses (status: pending)
    |— POST para n8n webhook com { call_id, recording_url, user_id }
    |
    | 11. n8n processa:
    |   |— Download áudio do Supabase Storage
    |   |— Envia para Gemini (transcrição + análise)
    |   |— POST /api/calls/[id]/analysis com resultado
    v
[API Route: /api/calls/[id]/analysis]  ← chamado pelo n8n
    |— Valida token de serviço n8n
    |— Salva transcrição, resumo, pontos, objeções, sugestões
    |— Atualiza call_analyses.status = completed
    |
    | 10b. Usuário clica "Ignorar"
    v
[Nenhum crédito consumido. Call permanece sem análise]
```

---

## Fluxo de Transferência de Gravação

```
[Twilio armazena gravação após chamada]
    |
    | Status Callback chega com RecordingSid + RecordingUrl
    v
[API Route: /api/calls/status]
    |— Salva recording_sid na tabela calls
    |— Enfileira job de transferência
    v
[Cron Job: /api/cron/transfer-recordings]  (intervalo: 5 min)
    |— Busca calls com recording_sid e sem recording_url (Supabase Storage)
    |— Para cada uma:
    |   |— GET https://api.twilio.com/recordings/{sid}.mp3 (autenticado)
    |   |— Upload para Supabase Storage: call-recordings/{user_id}/{call_id}.mp3
    |   |— Atualiza calls.recording_url e calls.recording_expires_at (+15 dias)
    |   |— Deleta da Twilio (para não pagar armazenamento desnecessário)
    v
[Cron Job: /api/cron/expire-recordings]  (intervalo: diário)
    |— Busca calls onde recording_expires_at < now()
    |— Remove do Supabase Storage
    |— Atualiza calls.recording_url = null
```

---

## Qualidade de Leads e Canais Disponíveis

> Decisões completas em [DT-CALLS-03.md](DT-CALLS-03.md).

Com o módulo de Calls, cada lead em `global_leads` passa a ser classificado por disponibilidade de canal:

| Classificação | Condição | Canal Email | Canal Calls |
|---|---|---|---|
| `complete` | Tem phone AND email | ✅ | ✅ |
| `partial_phone` | Tem phone, sem email | ❌ | ✅ |
| `partial_email` | Tem email, sem phone | ✅ | ❌ |
| `invalid` | Sem nenhum canal | ❌ | ❌ — nunca chega ao usuário |

### Impacto na UI

- Botão "Ligar": habilitado apenas se `phone` preenchido
- Botão "Enviar Email": habilitado apenas se `email` preenchido
- Ambos os botões refletem o canal disponível sem alterar a lógica de busca

### Distribuição para usuários (meta V1)

O sistema entrega leads priorizando `complete` para atingir a meta 70% completos / 30% parciais por lote de busca. Nenhum filtro de canal é exposto ao usuário na V1.

### Pipeline de enriquecimento (n8n)

Antes de publicar, novos leads passam pelo workflow `lead-enrichment-pipeline` no n8n (ver CALLS_ROADMAP.md — Fase 0.5):
- Nível 1: scraping do website (sem custo de IA)
- Nível 2: Gemini como fallback (só quando scraping falha)
- Mesma instância n8n usada para análise de chamadas — workflows separados

---

## Integração com Estruturas Existentes

### Timeline (LeadTimeline.tsx)

O componente `LeadTimeline` já agrega eventos de múltiplas tabelas. Adicionaremos calls:

```typescript
// Tipos de evento atuais:
// lead_created | email_sent | reply_received | followup_created | followup_completed

// Novos tipos:
// call_initiated | call_completed | call_failed | call_analyzed
```

A query do timeline fará LEFT JOIN com `calls WHERE (lead_id = $1 OR user_lead_id = $1)`.

### Followups

Após análise da IA, o relatório sugere um próximo contato. O usuário pode:
1. Ver a sugestão no relatório de análise
2. Clicar "Criar followup" para aceitar com 1 clique
3. O followup é criado via `FollowupCreateForm` existente, pré-preenchido com dados da sugestão

A IA **nunca** cria followups automaticamente — regra inviolável.

### Status dos Leads

O relatório de análise exibe `suggested_status`. O usuário vê e pode clicar "Aplicar" para atualizar via `updateLeadStatus` existente. A IA nunca chama essa função diretamente.

### Página do Lead

```
[Página atual]
─────────────────────
[ Enviar Email ]

[Página V2]
─────────────────────
[ Enviar Email ]   [ Ligar ]
```

O botão "Ligar" abre um modal gerenciado pelo `PhoneCallModal` (novo componente client-side).

---

## Arquitetura do Provedor de Telefonia

**Regra arquitetural:** `import from 'twilio'` (ou de qualquer SDK de provedor) só pode aparecer em `src/lib/telephony/twilioProvider.ts`. O restante da aplicação conhece apenas `ITelephonyProvider`.

```
src/
├── lib/
│   └── telephony/                    ← tudo relacionado ao SDK do provedor fica aqui
│       ├── ITelephonyProvider.ts     ← interface + DTOs normalizados
│       ├── twilioProvider.ts         ← ÚNICO arquivo que importa 'twilio'
│       └── factory.ts                ← cria o provider a partir de TelephonySettings
│
├── services/
│   └── callService.ts                ← lógica de negócio (usa ITelephonyProvider)
│
└── features/
    └── calls/
        └── components/
            ├── PhoneCallModal.tsx
            ├── CallTimer.tsx
            ├── CallAnalysisReport.tsx
            └── CallHistoryItem.tsx   ← Para o timeline
```

**Fluxo de dependências:**

```
UI (components)
    ↓
API Routes  (src/app/api/calls/*)
    ↓  — chama apenas callService, nunca o provider diretamente
callService  (src/services/callService.ts)
    ↓  — recebe ITelephonyProvider via factory
ITelephonyProvider  (src/lib/telephony/ITelephonyProvider.ts)
    ↓
TwilioProvider  (src/lib/telephony/twilioProvider.ts)
```

Para trocar de provedor no futuro: implementar `ITelephonyProvider`, registrar no `factory.ts`. Nenhuma rota, serviço ou componente precisa mudar.

```typescript
// src/lib/telephony/ITelephonyProvider.ts
interface ITelephonyProvider {
  generateAccessToken(userId: string): AccessTokenResult
  generateCallInstruction(to: string, callId: string, record: boolean): string
  validateWebhookSignature(signature: string, url: string, params: Record<string, string>): boolean
  parseOutboundCallRequest(params: Record<string, string>): OutboundCallRequest
  parseStatusCallback(params: Record<string, string>): CallStatusUpdate
}
```

---

## Arquitetura da IA (Model-Agnostic)

```
src/
└── features/
    └── calls/
        └── ai/
            ├── types.ts              ← Interface ICallAnalyzer + CallAnalysisResult
            ├── geminiAnalyzer.ts     ← Implementação Gemini
            ├── openaiAnalyzer.ts     ← Implementação futura OpenAI
            └── getAnalyzer.ts        ← Factory (lê env CALL_AI_PROVIDER)
```

```typescript
// features/calls/ai/types.ts
interface ICallAnalyzer {
  analyze(audioUrl: string, metadata: CallMetadata): Promise<CallAnalysisResult>
}

interface CallAnalysisResult {
  transcript: string
  summary: string
  keyPoints: string[]
  objections: string[]
  suggestedStatus: string | null
  suggestedFollowupDays: number | null
  suggestedFollowupNotes: string | null
  modelUsed: string
}
```

---

## Gerenciamento de Credenciais Twilio

As credenciais do usuário são sensíveis. Armazenamento:

```
telephony_settings.auth_token_encrypted = AES-256-GCM(auth_token, TELEPHONY_MASTER_KEY)
```

- `TELEPHONY_MASTER_KEY` → variável de ambiente no Vercel (nunca no banco)
- Descriptografia acontece apenas no servidor, nos Route Handlers
- Auth Token nunca é enviado ao cliente
- Access Token Twilio (JWT de curta duração, ~1h) é o único token que vai ao browser

---

## Variáveis de Ambiente Necessárias

```env
# Criptografia de credenciais Twilio dos usuários
TELEPHONY_MASTER_KEY=<32 bytes hex>

# Token para validar callbacks do n8n → Prospecta
N8N_WEBHOOK_SECRET=<string aleatória>

# n8n webhook URL para disparar análise
N8N_CALL_ANALYSIS_WEBHOOK_URL=https://n8n.exemplo.com/webhook/call-analysis

# Gemini API Key (usado pelo n8n, não pelo Prospecta diretamente)
# → Configurado no n8n, não no Prospecta
```

---

## Rotas API Necessárias

| Rota | Método | Quem chama | Descrição |
|---|---|---|---|
| `/api/calls/token` | POST | Browser (SDK) | Gera Twilio Access Token |
| `/api/calls/twiml` | POST | Twilio Cloud | Retorna TwiML para a chamada |
| `/api/calls/status` | POST | Twilio Cloud | Callback de status e gravação |
| `/api/calls/[id]/request-analysis` | POST | Browser | Solicita análise (consome crédito) |
| `/api/calls/[id]/analysis` | POST | n8n | Recebe resultado da IA |
| `/api/calls/[id]` | GET | Browser | Busca dados de uma chamada |
| `/api/cron/transfer-recordings` | GET | Vercel Cron | Transfere gravações do Twilio |
| `/api/cron/expire-recordings` | GET | Vercel Cron | Expira gravações antigas (15 dias) |

---

## Considerações de Segurança

1. **Validação de assinatura Twilio:** Toda request do Twilio para `/api/calls/twiml` e `/api/calls/status` deve ser validada com `twilio.validateRequest(authToken, signature, url, params)` — rejeitar se inválida (HTTP 403).

2. **Token n8n:** O endpoint `/api/calls/[id]/analysis` deve validar `Authorization: Bearer {N8N_WEBHOOK_SECRET}` — rejeitar se inválido.

3. **Autorização de usuário:** `/api/calls/[id]` deve verificar que `calls.user_id = auth_user.id` antes de retornar dados.

4. **Rate limiting:** `/api/calls/token` deve ter rate limit por usuário para prevenir geração excessiva de tokens.

5. **Números de telefone:** Validar formato E.164 antes de qualquer chamada Twilio — um número malformado pode gerar erros silenciosos.
