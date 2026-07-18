# Tasks V1 — Novo Modelo de Negócio

Documento de implementação incremental da V1 do Prospecta.
Cada fase é autossuficiente — leia a fase atual antes de implementar qualquer coisa.

**Branch de desenvolvimento:** `develop` → merge para `main` ao concluir cada fase.

---

## Decisões já tomadas (não rediscutir)

| Decisão | Definição |
|---|---|
| Saldo de teste | R$ 100,00 inicial para verificar débitos |
| Saldo de boas-vindas | R$ 10,00 (uma vez por conta) |
| Admin | Ilimitado — mecanismo: `ADMIN_USER_IDS` env var (já existe) |
| Pagamento | **Asaas** — assinatura recorrente R$150/mês + recarga avulsa Pix/cartão |
| 150 leads de boas-vindas | Via fluxo "Buscar Leads" existente — usuário escolhe o nicho, importa manualmente |
| Leads esgotados | Redireciona para pacotes de leads extras |
| Bloquear sem saldo | Ligação: bloquear se saldo < R$ 0,20 · Análise: bloquear se saldo < custo estimado |
| Tarifa de ligação | **[Atualizado 2026-07-14]** R$ 0,15/min → **R$ 0,20/min**. Motivo: com número Telnyx dedicado por usuário (~R$16,52/mês, decisão acima), R$0,15/min só empatava com ~955 min/mês de uso por usuário; a R$0,20/min o breakeven cai pra ~245 min/mês e a margem some do vermelho na maioria dos cenários de uso real. Ainda abaixo do concorrente FiberTel (R$0,26/min celular). |
| `analysis_credits` | **Descontinuada** — substituída pelo `wallet_balances` |
| Telnyx | **[Atualizado 2026-07-14]** Implementado e ativo (não é mais stub — ver histórico de commits `feat(calls): telnyx...`). Substitui o Twilio como provider de telefonia. |
| Telnyx — número por conta | **[Decisão 2026-07-14]** Um número Telnyx **dedicado por usuário** (não compartilhado/platform-level). Motivo: a ANATEL bloqueia uso de CallerID externo, então não é possível originar chamadas de vários usuários por um único número — cada conta precisa do seu próprio número, vinculado ao `user_id`. Custo: ~US$3/mês (≈R$16,52) por número, pago pela Prospecta. Isso invalida o comentário "uso futuro com Telnyx platform-level" da Fase 2.2 abaixo — mantido no doc só por histórico de implementação, não reflete mais a decisão de custo. |
| Telnyx — uma Application só | **[Atualizado 2026-07-17]** Números do pool (`telnyx_numbers`) ficam todos na MESMA Application/Connection usada pelo SDK de saída (`TELNYX_APP_ID`), não numa Application separada. Motivo: um número só pode estar em uma connection por vez — pra funcionar de ponta a ponta (vendedor liga com o próprio número → lead vê esse número → lead liga de volta pro mesmo número → cai no encaminhamento), a mesma connection precisa atender as duas direções. `/api/calls/twiml` detecta o sentido pela presença de SIP headers (`SipHeader_X-ProspectaUserId`): presente = saída, ausente = lead ligando de volta. Chamadas de saída também passaram a usar o número dedicado do usuário que está ligando (via `telnyx_numbers`) como CallerID, em vez do `TELNYX_PHONE_NUMBER` fixo. |

---

## Pendências / débitos técnicos

- [ ] **Testar e2e o encaminhamento de chamada de entrada** (feature implementada em 2026-07-17, ainda não validada com ligação real): aplicar as 3 migrations novas no Supabase (`telnyx_numbers`, campos regulatórios em `company_profiles`, relaxamento do `calls_lead_xor`), associar um número real à Application Telnyx, atribuir esse número a um usuário (via admin ou fluxo normal), preencher CPF/CNPJ + celular de encaminhamento em Configurações → Telefonia, ligar de um celular externo pro número atribuído e confirmar: o celular de encaminhamento toca, a chamada aparece em `calls` com `direction='inbound'`, e **nenhum** débito é criado em `wallet_transactions` pra essa chamada.
- [ ] Testar o fluxo admin de atribuir/liberar número manualmente (`AdminNumberPool`) com um segundo perfil de teste antes de usar em cliente real.
- [ ] **Testar e2e a Fase 8 (Asaas)** (implementada em 2026-07-17, aguardando credenciais de sandbox): aplicar a migration `20260718000000_profiles_subscription.sql` e confirmar que todas as contas existentes ficaram com `subscription_status='active', subscription_source='beta_grandfather'`; configurar `ASAAS_API_KEY`/`ASAAS_WEBHOOK_TOKEN`/`ASAAS_SANDBOX=true` na Vercel; testar assinatura (QR Pix → webhook ativa `subscription_status`) e recarga (QR Pix → crédito em `wallet_transactions`) em sandbox; confirmar que reenviar o mesmo webhook duas vezes não duplica crédito (idempotência do `credit_wallet`); confirmar que uma conta nova (sem grandfather) é bloqueada em `/api/calls/token` até assinar.
- [ ] **Decidir o gating de CRM/leads/templates pra quem não tem assinatura ativa.** Direção apontada (não implementada): visualizar CRM e busca de leads livre, mas travar ações de escrita (adicionar lead, criar template, etc.) sem assinatura — precisa ser detalhado antes de implementar (quais ações exatamente ficam travadas, mensagem de bloqueio, etc.). O bloqueio de ligações (`token/route.ts`) já está implementado e não depende dessa decisão.

---

## Tarifas de consumo (referência)

| Ação | Tarifa | Cálculo |
|---|---|---|
| Ligação | R$ 0,20/min | `Math.ceil(duration_seconds / 60) × 0.20` |
| Análise de IA | R$ 0,08/min de áudio | `Math.ceil(duration_seconds / 60) × 0.08` |
| 50 leads extras | R$ 19,90 | Débito único do saldo |
| 150 leads extras | R$ 49,90 | Débito único do saldo |
| 500 leads extras | R$ 189,90 | Débito único do saldo |

---

## O que NÃO muda (não tocar)

- CRM, kanban, leads, followups, templates
- Fluxo Twilio completo (token, TwiML, gravação, storage, callbacks)
- Pipeline n8n (AssemblyAI + GPT)
- Auth, Gmail OAuth, sync de replies
- Componentes: `PhoneCallModal`, `CallButton`, `LeadCallsSection`
- Rotas: `/api/calls/*`, `/api/gmail/*`, `/api/cron/*`

---

## Fase 1 — Banco de dados (fundação)

> Pré-requisito de todas as fases seguintes. Criar as migrations antes de qualquer código.

### 1.1 Tabela `wallet_balances`

```sql
-- supabase/migrations/20260705000000_wallet_balances.sql
CREATE TABLE wallet_balances (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance    decimal(10,2) NOT NULL DEFAULT 0.00,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê o próprio saldo"
  ON wallet_balances FOR SELECT
  USING (auth.uid() = user_id);

-- Débito atômico — chamado exclusivamente pelo backend (admin client)
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id uuid,
  p_amount  decimal
) RETURNS decimal
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_balance decimal;
BEGIN
  UPDATE wallet_balances
     SET balance    = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND balance >= p_amount
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  RETURN new_balance;
END;
$$;

-- Crédito — chamado no onboarding, recarga e compra de leads
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id uuid,
  p_amount  decimal
) RETURNS decimal
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_balance decimal;
BEGIN
  INSERT INTO wallet_balances (user_id, balance)
    VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
    DO UPDATE SET balance    = wallet_balances.balance + EXCLUDED.balance,
                  updated_at = now()
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$;
```

### 1.2 Tabela `wallet_transactions` (histórico de auditoria)

```sql
-- supabase/migrations/20260705000001_wallet_transactions.sql
CREATE TABLE wallet_transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL, -- 'call' | 'analysis' | 'leads_purchase' | 'recharge' | 'bonus' | 'welcome'
  amount       decimal(10,2) NOT NULL, -- positivo = crédito, negativo = débito
  balance_after decimal(10,2) NOT NULL,
  reference_id text,  -- call_id, analysis_id, package_id, asaas_payment_id
  description  text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprias transações"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX wallet_transactions_user_id_idx ON wallet_transactions (user_id, created_at DESC);
```

### 1.3 Flag `welcome_credited` em `profiles`

```sql
-- supabase/migrations/20260705000002_profiles_welcome_credited.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_credited boolean NOT NULL DEFAULT false;
```

### 1.4 Descontinuar `analysis_credits`

- Manter a tabela existente intacta (não dropar — dados históricos)
- Não criar novos registros nela
- O código de `src/repositories/analysisCreditRepository.ts` será substituído na Fase 4
- A função SQL `deduct_analysis_credit` pode ser mantida mas não será mais chamada

**Checklist Fase 1:**
- [ ] Migration `20260705000000_wallet_balances.sql` aplicada no Supabase (develop)
- [ ] Migration `20260705000001_wallet_transactions.sql` aplicada
- [ ] Migration `20260705000002_profiles_welcome_credited.sql` aplicada
- [ ] Testar: inserir R$ 100,00 manual no banco para o usuário de teste e verificar RLS

---

## Fase 2 — Telephony Provider Architecture

> Independente das demais fases. Pode ser feita a qualquer momento.

### Contexto — o que já existe

- `src/lib/telephony/ITelephonyProvider.ts` — interface **já existe** com os métodos corretos
- `src/lib/telephony/twilioProvider.ts` — `TwilioProvider implements ITelephonyProvider` **já existe**
- `src/lib/telephony/factory.ts` — `createProviderFromSettings(settings)` **já existe** (recebe credenciais do banco por usuário)

### 2.1 Criar `TelnyxProvider` (stub)

```
src/lib/telephony/telnyxProvider.ts
```

Implementar `ITelephonyProvider` com `throw new Error('TelnyxProvider: <método> não implementado ainda')` em todos os métodos. `readonly name = 'telnyx'`.

### 2.2 Atualizar factory

Adicionar ao `factory.ts` uma função exportada `getProviderByEnv()` que lê `process.env.TELEPHONY_PROVIDER`:

```typescript
// ⚠️ Comentário desatualizado — ver "Decisões já tomadas": Telnyx passou a ser
// um número dedicado por usuário (ANATEL bloqueia CallerID externo compartilhado),
// não platform-level como sugerido abaixo.
// Wrapper para quando não há settings de usuário (uso futuro com Telnyx platform-level)
export function getProviderByEnv(): ITelephonyProvider {
  const provider = process.env.TELEPHONY_PROVIDER ?? 'twilio'
  if (provider === 'telnyx') return new TelnyxProvider()
  throw new Error('getProviderByEnv: twilio requer createProviderFromSettings(settings)')
}
```

A função `createProviderFromSettings(settings)` existente **não muda** — continua sendo a entrada para o fluxo Twilio.

### 2.3 Atualizar `.env.example`

```
# Telephony Provider — twilio (padrão) ou telnyx
TELEPHONY_PROVIDER=twilio

# Telnyx (preencher quando tivermos master account)
# TELNYX_API_KEY=
# TELNYX_PUBLIC_KEY=
# TELNYX_APP_ID=
# TELNYX_CONNECTION_ID=
```

**Checklist Fase 2:**
- [ ] `src/lib/telephony/telnyxProvider.ts` criado com stub
- [ ] `factory.ts` atualizado com `getProviderByEnv()`
- [ ] `.env.example` atualizado
- [ ] `TELEPHONY_PROVIDER=twilio` adicionado nas env vars da Vercel (develop + main)
- [ ] Verificar: o fluxo Twilio continua funcionando (ligação de teste)

---

## Fase 3 — Wallet Backend: Débito de Ligações

### Contexto — o que já existe

- `src/app/api/calls/status/route.ts` — recebe o webhook da Twilio com `CallDuration`
- `src/lib/telephony/twilioProvider.ts` linha 108 — `CallDuration` é parseado e retornado como `durationSeconds`
- `src/services/callService.ts` linha 179 — `durationSeconds` é gravado em `calls.duration_seconds`
- **O que falta:** usar o `duration_seconds` para debitar o saldo

### 3.1 `src/repositories/walletRepository.ts` (criar)

```typescript
// Funções a criar:
// debitWallet(adminSupabase, userId, amount, type, referenceId, description) → decimal
// creditWallet(adminSupabase, userId, amount, type, referenceId, description) → decimal
// getBalance(supabase, userId) → decimal
// getTransactions(supabase, userId, limit?) → WalletTransaction[]
```

Usar sempre `adminSupabase` (admin client) para operações de débito/crédito — as RPCs `debit_wallet` e `credit_wallet` usam `SECURITY DEFINER`.

### 3.2 Débito na conclusão da ligação

**Arquivo:** `src/services/callService.ts`, função `handleStatusCallbackWebhook`

Após gravar `duration_seconds` em `calls` e status for `completed`:

```typescript
if (update.status === 'completed' && update.durationSeconds && update.durationSeconds > 0) {
  const minutos = Math.ceil(update.durationSeconds / 60)
  const custo = parseFloat((minutos * 0.20).toFixed(2))
  // Não bloquear o callback se o débito falhar — logar o erro e seguir
  try {
    await debitWallet(adminSupabase, userId, custo, 'call', callId, `Ligação ${minutos} min`)
  } catch (err) {
    console.error('[callService] débito de ligação falhou:', err)
  }
}
```

- Admin users (`ADMIN_USER_IDS`) — pular o débito (verificar antes de chamar `debitWallet`)
- Se `debit_wallet` lançar `insufficient_balance` aqui: logar, não retornar erro para a Twilio (o callback já aconteceu)

### 3.3 Bloquear ligação com saldo insuficiente

**Arquivo:** `src/app/api/calls/token/route.ts`

Antes de gerar o AccessToken:
1. Verificar se `user.id` está em `ADMIN_USER_IDS` → pular verificação
2. Buscar `wallet_balances.balance` do usuário
3. Se `balance < 0.20` → retornar `{ error: 'saldo_insuficiente', balance, minimo: 0.20 }` com status 402

**Checklist Fase 3:**
- [ ] `src/repositories/walletRepository.ts` criado
- [ ] Débito implementado em `callService.ts` após status `completed`
- [ ] Bloqueio implementado em `/api/calls/token/route.ts`
- [ ] Testar com R$ 100,00 no banco: ligar 2 min → verificar débito de R$ 0,40
- [ ] Testar bloqueio: zerar saldo → botão de ligar deve retornar 402

---

## Fase 4 — Wallet Backend: Débito de Análise de IA

### Contexto — o que já existe

- `src/services/callService.ts`, `requestCallAnalysis` — debita 1 crédito inteiro de `analysis_credits`
- `src/repositories/analysisCreditRepository.ts` — lógica atual de créditos (a substituir)
- `calls.duration_seconds` — duração da chamada gravada (usada para calcular custo)

### 4.1 Substituir verificação de crédito por verificação de saldo

**Arquivo:** `src/services/callService.ts`, função `requestCallAnalysis`

Substituir o bloco que checa e debita `analysis_credits` por:

```typescript
// Admin users: pular verificação
if (!isAdmin) {
  const duracao = call.duration_seconds ?? 0
  const minutos = Math.ceil(duracao / 60)
  const custo = parseFloat((minutos * 0.08).toFixed(2))

  const { balance } = await getBalance(adminSupabase, userId)
  if (balance < custo) {
    return { ok: false, error: 'Saldo insuficiente para analisar esta ligação.', custo, balance, status: 402 }
  }

  await debitWallet(adminSupabase, userId, custo, 'analysis', callId, `Análise ${minutos} min`)
}
```

- O valor `custo` deve ser retornado no corpo do 402 para a UI exibir o modal de confirmação
- A coluna `call_analyses.credits_used` passa a armazenar o custo em reais (decimal)

### 4.2 Remover referências a `analysisCreditRepository`

- `requestCallAnalysis` para de importar `analysisCreditRepository`
- Endpoint `GET /api/calls/[id]/analysis` que retornava créditos restantes: atualizar para retornar saldo do wallet
- Manter o arquivo `analysisCreditRepository.ts` mas não chamar mais suas funções

**Checklist Fase 4:**
- [ ] `requestCallAnalysis` usa `walletRepository` em vez de `analysisCreditRepository`
- [ ] Retorno 402 inclui `{ custo, balance }` para uso na UI
- [ ] `call_analyses.credits_used` grava o valor em reais
- [ ] Testar: solicitar análise → verificar débito correto no `wallet_transactions`
- [ ] Testar bloqueio: saldo < custo → deve retornar 402 com custo estimado

---

## Fase 5 — Créditos de Boas-Vindas (Onboarding)

### Contexto — o que já existe

- `src/app/onboarding/` — wizard de 9 steps
- Step 6: busca e importação manual de leads via `SearchForm` com `betaLimit={20}`
- `src/app/onboarding/actions.ts` — `onboardingAction` cria `company_profile` mas não credita nada
- `profiles.welcome_credited` — coluna criada na Fase 1

### 5.1 Lógica de boas-vindas (executar UMA VEZ)

Criar `src/services/welcomeService.ts`:

```typescript
// creditWelcome(adminSupabase, userId): Promise<void>
// 1. Verificar profiles.welcome_credited = false → abortar se já creditado
// 2. Creditar R$ 10.00 no wallet (type='welcome', description='Bônus de boas-vindas')
// 3. Marcar profiles.welcome_credited = true
// Não creditar os 150 leads aqui — leads são creditados via Buscar Leads (Fase 7)
```

### 5.2 Disparar no onboarding

**Arquivo:** `src/app/onboarding/actions.ts`

Após criar o `company_profile` com sucesso, chamar `creditWelcome(adminSupabase, user.id)`.

Usar `adminSupabase` (admin client) pois o `profiles.welcome_credited` atualizado usa `UPDATE` em tabela com RLS restrita.

### 5.3 Saldo de teste para o admin

Para verificar os débitos durante desenvolvimento, inserir R$ 100,00 diretamente no banco para o usuário admin de teste:

```sql
-- Rodar manualmente no Supabase SQL Editor (apenas em develop)
SELECT credit_wallet('<uuid-do-usuario-teste>', 100.00);
```

**Checklist Fase 5:**
- [ ] `welcomeService.ts` criado com verificação de idempotência
- [ ] `onboardingAction` chama `creditWelcome` após criar `company_profile`
- [ ] Testar: criar conta nova → verificar R$ 10,00 no `wallet_balances` + transação em `wallet_transactions`
- [ ] Testar idempotência: tentar creditar segunda vez → deve ser bloqueado pelo flag
- [ ] Admin: R$ 100,00 creditado manualmente no banco de teste

---

## Fase 6 — UI: Widget de Saldo e Modal de Análise

> Depende das Fases 1 e 4.

### 6.1 Widget de saldo na sidebar

**Arquivo:** `src/components/layout/Sidebar.tsx`

- Criar `SidebarBalance` — client component que busca o saldo via query Supabase realtime ou polling (30s)
- Exibir entre o CTA "Adicionar Leads" e o `SidebarFooter`
- Formato: `Saldo: R$ 18,30` com link "Recarregar →" (aponta para `/settings?section=plano`)
- Se saldo < R$ 0,20: exibir em vermelho com texto "Saldo insuficiente"
- Admin users: não exibir widget

### 6.2 Modal de confirmação de análise

**Arquivo:** `src/features/calls/components/LeadCallsSection.tsx` (ou componente filho)

Quando usuário clica em "Analisar":
1. Fazer `POST /api/calls/[id]/request-analysis`
2. Se resposta for 402: exibir modal com `{ custo, balance }` retornados
   - "Esta análise consumirá **R$ X,XX**"
   - "Saldo atual: R$ Y,YY · Saldo após: R$ Z,ZZ"
   - Botão "Recarregar saldo" → `/settings?section=plano`
3. Se resposta for 200: exibir feedback de sucesso (já existe)

**Checklist Fase 6:**
- [ ] Widget de saldo renderiza na sidebar para usuários não-admin
- [ ] Saldo em vermelho quando < R$ 0,20
- [ ] Modal de saldo insuficiente aparece ao tentar analisar sem saldo
- [ ] Link "Recarregar" funciona

---

## Fase 7 — Leads: Cota de Boas-Vindas e Pacotes Extras

### Contexto — o que já existe

- `src/app/(app)/search/` — página de busca de leads via Apify
- Leads importados via `user_leads` (global) ou `leads` (manual)
- O limite atual é `betaLimit={20}` hardcoded no step 6 do onboarding

### Decisão de arquitetura (confirmar antes de implementar)

Os **150 leads de boas-vindas** são gerenciados pelo fluxo "Buscar Leads":
- O usuário busca por nicho e cidade → importa para o banco dele
- O contador decresce a cada importação
- Quando chega a 0, mostrar pacotes de leads extras
- Após comprar pacote, novas buscas são liberadas com o saldo do pacote

### 7.1 Contador de leads de boas-vindas

Nova coluna em `profiles`:

```sql
-- supabase/migrations/20260705000003_profiles_welcome_leads.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_leads_total   integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS welcome_leads_used    integer NOT NULL DEFAULT 0;
```

`welcome_leads_used` é incrementado cada vez que o usuário importa leads pelo fluxo de busca.

### 7.2 Lógica na página de busca (`/search`)

- Exibir progresso: "Leads de boas-vindas: 87/150 restantes"
- Bloquear importação além do limite: se `welcome_leads_used + qtd_importar > welcome_leads_total` → exibir aviso com opção de comprar pacote
- Quando `welcome_leads_used >= welcome_leads_total` → exibir CTA de pacotes no lugar do formulário de busca
- Após comprar pacote: incrementar `welcome_leads_total` com os leads comprados → buscas desbloqueadas

### 7.3 Tela de pacotes de leads extras

Nova página: `src/app/(app)/leads/packages/page.tsx`

| Pacote | Leads | Preço | Custo real |
|---|---|---|---|
| Starter | 50 | R$ 19,90 | R$ 1,15 |
| Popular | 150 | R$ 49,90 | R$ 3,45 |
| Pro | 500 | R$ 189,90 | R$ 11,50 |

Fluxo de compra:
1. Verificar saldo suficiente → se não: "Saldo insuficiente — recarregar"
2. Confirmação: "Isso debitará R$ X,XX do seu saldo"
3. `POST /api/wallet/buy-leads` → débito atômico + incremento em `welcome_leads_total`
4. Retornar para busca de leads com novo saldo

### 7.4 Rota `POST /api/wallet/buy-leads`

```typescript
// Validações:
// - Auth
// - package in ['50', '150', '500']
// - Saldo suficiente
// Ações:
// - debitWallet(adminSupabase, userId, price, 'leads_purchase', packageId, '50 leads')
// - UPDATE profiles SET welcome_leads_total = welcome_leads_total + quantity WHERE id = userId
```

**Checklist Fase 7:**
- [ ] Migration com `welcome_leads_total` e `welcome_leads_used` aplicada
- [ ] Página de busca exibe progresso de leads restantes
- [ ] Importação bloqueada ao atingir limite
- [ ] Tela de pacotes criada com 3 opções
- [ ] Rota `/api/wallet/buy-leads` com débito e incremento de cota
- [ ] Após compra, busca desbloqueada corretamente

---

## Fase 8 — Integração Asaas

> **[Atualizado 2026-07-17]** Implementada (`src/services/asaasService.ts`, `src/app/api/asaas/webhook`, `src/app/api/wallet/recharge`, `SubscribeForm`/`RechargeForm` em Configurações). Desambiguação entre assinatura e recarga é via `externalReference` (`subscription:<userId>` | `recharge:<userId>`), não via `description` como o rascunho original em 8.2 sugeria. Assinatura usa `billingType: 'UNDEFINED'` (Asaas oferece Pix e cartão no checkout). Bloqueio de ligação sem assinatura ativa implementado em `token/route.ts`; contas existentes antes desta fase foram marcadas `subscription_status='active', subscription_source='beta_grandfather'` via migration, então não foram afetadas. Falta só validar de ponta a ponta com credenciais de sandbox — ver "Pendências / débitos técnicos".

### Contexto e decisões

- **Assinatura:** R$ 150/mês recorrente (Pix ou cartão) — Asaas cria a cobrança automaticamente
- **Recarga de saldo:** usuário escolhe valor (mínimo R$ 30) → Asaas gera QR Code Pix → webhook credita saldo
- **Mínimo de recarga:** R$ 30,00

### Env vars a adicionar (quando disponíveis)

```
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=    # para validar webhooks recebidos
ASAAS_SANDBOX=true      # false em produção
```

### 8.1 Assinatura recorrente

**Webhook:** `POST /api/asaas/webhook`

- Evento `PAYMENT_CONFIRMED` com tipo `SUBSCRIPTION` → ativar/renovar acesso do usuário
- Armazenar `asaas_customer_id` e `asaas_subscription_id` em `profiles`
- Renovação: apenas logar e marcar `subscription_paid_at`

### 8.2 Recarga de saldo

**Rota:** `POST /api/wallet/recharge`
- Valida `amount >= 30`
- Cria cobrança Pix no Asaas via API (`POST /v3/payments`)
- Retorna `{ qrCode, qrCodeUrl, expiresAt }` para o frontend exibir

**Webhook:** `POST /api/asaas/webhook`
- Evento `PAYMENT_CONFIRMED` com tipo `BOLETO` ou `PIX` e `description` contendo `recharge` → creditar saldo via `creditWallet`

### 8.3 UI de recarga

- Página `/settings?section=plano` atualizada com:
  - Plano atual: R$ 150/mês · status da assinatura
  - Saldo atual + botão "Recarregar"
  - Ao clicar: input de valor (mínimo R$ 30) → gera QR Code Pix inline
  - Polling a cada 3s para detectar pagamento confirmado e atualizar saldo na tela

**Checklist Fase 8:**
- [x] Conta Asaas criada
- [x] `POST /api/asaas/webhook` implementado com validação do `ASAAS_WEBHOOK_TOKEN`
- [x] Assinatura recorrente: webhook `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` ativa o usuário
- [x] Recarga: rota gera QR Code Pix + webhook credita saldo
- [x] UI de assinatura e recarga em Configurações
- [x] Bloqueio de ligação sem assinatura ativa (`token/route.ts`)
- [ ] Credenciais de sandbox configuradas na Vercel e testadas de ponta a ponta (ver "Pendências / débitos técnicos")
- [ ] Deploy em main com `ASAAS_SANDBOX=false`

---

## Resumo de novos arquivos a criar

| Arquivo | Fase | Descrição |
|---|---|---|
| `supabase/migrations/20260705000000_wallet_balances.sql` | 1 | Tabela + RPCs de débito/crédito |
| `supabase/migrations/20260705000001_wallet_transactions.sql` | 1 | Histórico de transações |
| `supabase/migrations/20260705000002_profiles_welcome_credited.sql` | 1 | Flag de boas-vindas |
| `supabase/migrations/20260705000003_profiles_welcome_leads.sql` | 7 | Cota de leads |
| `src/repositories/walletRepository.ts` | 3 | Débito, crédito, saldo, histórico |
| `src/services/welcomeService.ts` | 5 | Crédito único de boas-vindas |
| `src/lib/telephony/telnyxProvider.ts` | 2 | Stub com NotImplementedError |
| `src/app/(app)/leads/packages/page.tsx` | 7 | Tela de pacotes extras |
| `src/app/api/wallet/buy-leads/route.ts` | 7 | Compra de pacote |
| `src/app/api/asaas/webhook/route.ts` | 8 | Webhook de pagamento |
| `src/app/api/wallet/recharge/route.ts` | 8 | Geração de QR Code Pix |

## Resumo de arquivos a modificar

| Arquivo | Fase | O que muda |
|---|---|---|
| `src/lib/telephony/factory.ts` | 2 | Adicionar `getProviderByEnv()` |
| `src/services/callService.ts` | 3 + 4 | Débito de ligação + substituir analysis_credits |
| `src/app/api/calls/token/route.ts` | 3 | Bloquear se saldo < R$ 0,20 |
| `src/app/onboarding/actions.ts` | 5 | Chamar `creditWelcome` |
| `src/components/layout/Sidebar.tsx` | 6 | Widget de saldo |
| `src/app/(app)/search/page.tsx` | 7 | Progresso de cota + bloqueio |
| `src/app/(app)/settings/page.tsx` | 8 | Seção de plano real |
