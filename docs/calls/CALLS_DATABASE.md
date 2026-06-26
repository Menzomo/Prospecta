# CALLS_DATABASE.md — Schema do Banco de Dados

**Versão:** 1.0  
**Data:** 2026-06-21  
**Status:** Planejamento (não implementado)

---

## Tabelas Novas

### 1. `telephony_settings`

Armazena as credenciais Twilio de cada usuário. Auth Token e API Key Secret são sempre criptografados em repouso.

A autenticação pode usar dois modos:
- **Account SID + Auth Token** — credencial principal; funciona sem API Key.
- **Account SID + API Key SID + API Key Secret** *(recomendado)* — API Key pode ser revogada independentemente sem alterar o Auth Token. Preferida para geração de Access Tokens no browser.

O campo `api_key_sid` e `api_key_secret_encrypted` são opcionais; quando ausentes, o sistema recai para o Auth Token.

```sql
CREATE TABLE telephony_settings (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_sid                 text        NOT NULL,
  auth_token_encrypted        text        NOT NULL,   -- AES-256-GCM(auth_token, TELEPHONY_MASTER_KEY)
  api_key_sid                 text,                  -- SID da API Key Twilio (opcional, preferida para Access Tokens)
  api_key_secret_encrypted    text,                  -- AES-256-GCM(api_key_secret, TELEPHONY_MASTER_KEY)
  phone_number                text        NOT NULL,   -- Número Twilio em formato E.164 (+5511...)
  twiml_app_sid               text,                  -- SID do TwiML App configurado no Twilio
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT telephony_settings_user_unique UNIQUE (user_id),
  CONSTRAINT telephony_settings_phone_e164  CHECK (phone_number ~ '^\+[1-9]\d{7,14}$')
);

-- RLS: usuário só acessa suas próprias configurações
ALTER TABLE telephony_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telephony_settings: owner only"
  ON telephony_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2. `calls`

Registro de cada chamada realizada. Segue o padrão dual `lead_id / user_lead_id` já estabelecido em `email_messages` e `followups`.

```sql
CREATE TABLE calls (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id               uuid        REFERENCES leads(id) ON DELETE SET NULL,
  user_lead_id          uuid        REFERENCES user_leads(id) ON DELETE SET NULL,

  -- Twilio
  call_sid              text        NOT NULL UNIQUE,  -- Twilio Call SID (CA...)
  to_number             text        NOT NULL,          -- Número do lead (E.164)
  from_number           text        NOT NULL,          -- Número Twilio do usuário (E.164)
  direction             text        NOT NULL DEFAULT 'outbound',  -- outbound | inbound (futuro)

  -- Estado da chamada
  status                text        NOT NULL DEFAULT 'initiated',
  -- Valores: initiated | ringing | in-progress | completed | failed | no-answer | busy | canceled

  -- Duração e timing
  duration_seconds      integer,                      -- Null até chamada completar
  created_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,

  -- Gravação
  recording_sid         text,                         -- Twilio Recording SID (RE...)
  recording_url         text,                         -- URL no Supabase Storage (após transferência)
  recording_expires_at  timestamptz,                  -- Data de expiração (created_at + 15 dias)
  recording_deleted_at  timestamptz,                  -- Quando o arquivo foi excluído

  -- Anotações do usuário
  notes                 text,                         -- Campo livre pós-chamada

  CONSTRAINT calls_lead_xor CHECK (
    (lead_id IS NOT NULL AND user_lead_id IS NULL) OR
    (lead_id IS NULL AND user_lead_id IS NOT NULL)
  ),
  CONSTRAINT calls_direction_values CHECK (direction IN ('outbound', 'inbound')),
  CONSTRAINT calls_status_values CHECK (status IN (
    'initiated', 'ringing', 'in-progress', 'completed',
    'failed', 'no-answer', 'busy', 'canceled'
  ))
);

CREATE INDEX calls_user_id_idx        ON calls(user_id);
CREATE INDEX calls_lead_id_idx        ON calls(lead_id)       WHERE lead_id IS NOT NULL;
CREATE INDEX calls_user_lead_id_idx   ON calls(user_lead_id)  WHERE user_lead_id IS NOT NULL;
CREATE INDEX calls_created_at_idx     ON calls(created_at DESC);
CREATE INDEX calls_recording_expires  ON calls(recording_expires_at) WHERE recording_url IS NOT NULL;

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls: owner only"
  ON calls
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 3. `call_analyses`

Armazena o resultado da análise de IA para uma chamada. Relação 1:1 com `calls` (uma chamada pode ter no máximo uma análise).

```sql
CREATE TABLE call_analyses (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                     uuid        NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Estado do processamento
  status                      text        NOT NULL DEFAULT 'pending',
  -- Valores: pending | processing | completed | failed

  -- Resultado da IA
  transcript                  text,                         -- Transcrição completa
  summary                     text,                         -- Resumo da conversa
  key_points                  jsonb,                        -- string[]
  objections                  jsonb,                        -- string[]
  suggested_status            text,                         -- Status sugerido (nunca aplicado automaticamente)
  suggested_followup_days     integer,                      -- Dias para próximo contato
  suggested_followup_notes    text,                         -- Conteúdo sugerido para followup

  -- Metadados de processamento
  ai_model                    text,                         -- Ex: 'gemini-1.5-flash', 'gpt-4o'
  processing_started_at       timestamptz,
  processing_completed_at     timestamptz,
  error_message               text,                         -- Mensagem de erro se status = failed

  -- Créditos
  credits_used                integer     NOT NULL DEFAULT 1,

  created_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT call_analyses_call_unique UNIQUE (call_id),
  CONSTRAINT call_analyses_status_values CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT call_analyses_credits_positive CHECK (credits_used >= 0)
);

CREATE INDEX call_analyses_user_id_idx ON call_analyses(user_id);
CREATE INDEX call_analyses_status_idx  ON call_analyses(status) WHERE status IN ('pending', 'processing');

ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_analyses: owner only"
  ON call_analyses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 4. `analysis_credits`

Controla o saldo de créditos de análise por período (mensal). Projetado para suportar compra de créditos extras no futuro.

```sql
CREATE TABLE analysis_credits (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name       text        NOT NULL DEFAULT 'starter',   -- starter | pro | custom
  credits_total   integer     NOT NULL DEFAULT 200,
  credits_used    integer     NOT NULL DEFAULT 0,
  period_start    timestamptz NOT NULL,                      -- Início do período (geralmente 1º do mês)
  period_end      timestamptz NOT NULL,                      -- Fim do período
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT analysis_credits_user_period UNIQUE (user_id, period_start),
  CONSTRAINT analysis_credits_used_lte_total CHECK (credits_used <= credits_total),
  CONSTRAINT analysis_credits_non_negative CHECK (credits_used >= 0 AND credits_total >= 0)
);

CREATE INDEX analysis_credits_user_period_idx ON analysis_credits(user_id, period_start DESC);

-- Deduções devem ser atômicas para evitar race conditions
-- Usar: UPDATE analysis_credits SET credits_used = credits_used + 1
--       WHERE user_id = $1 AND period_start = $2 AND credits_used < credits_total
--       RETURNING credits_used  → se retornar 0 rows, crédito esgotado

ALTER TABLE analysis_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_credits: owner read"
  ON analysis_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Escrita apenas via service role (server-side)
```

---

## Tabelas Existentes — Colunas a Adicionar

### `global_leads` — normalização de telefone

Atualmente `phone` não tem formato padronizado. Adicionar coluna auxiliar:

```sql
-- Adicionar após validação de dados existentes
ALTER TABLE global_leads
  ADD COLUMN phone_e164 text,  -- Número normalizado E.164 (+5511...)
  ADD COLUMN phone_validated boolean NOT NULL DEFAULT false;

-- Índice para lookup por número
CREATE INDEX global_leads_phone_e164_idx ON global_leads(phone_e164) WHERE phone_e164 IS NOT NULL;
```

> **Nota:** Não popular imediatamente — requer script de normalização e validação dos números existentes.

### `leads` — campo phone já existe

A tabela `leads` já tem campo `phone`. Mesma normalização E.164 deve ser aplicada.

---

## Estrutura de Storage (Supabase)

```
Bucket: call-recordings
├── {user_id}/
│   ├── {call_id}.mp3
│   └── {call_id}.mp3
└── ...

Políticas:
- SELECT: auth.uid() = user_id (extraído do path)
- INSERT: apenas service role (backend)
- DELETE: apenas service role (backend, cron de expiração)
```

---

## Considerações de Performance

1. **Índice em `calls.recording_expires_at`:** O cron de expiração faz query diária neste índice — essencial para não fazer full scan.

2. **Deduções de crédito com UPDATE atômico:** Nunca fazer SELECT + UPDATE separados para créditos — condição de corrida. Sempre UPDATE com WHERE condicional e checar rowcount.

3. **`call_analyses.status`:** O índice parcial em `(status IN ('pending', 'processing'))` é para o polling do n8n ou para eventuais dashboards de monitoramento de jobs.

4. **Retenção de transcrição:** Mesmo após excluir o áudio (15 dias), `call_analyses.transcript` permanece indefinidamente — confirmar com o usuário se há expectativa de LGPD diferente.

---

## Migration Order

```
1. telephony_settings
2. calls
3. call_analyses
4. analysis_credits
5. global_leads (adicionar colunas phone_e164, phone_validated)
```
