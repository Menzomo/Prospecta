# DT-EMAIL-SYNC-01 — Auto Sincronização Inteligente do Dashboard

**Data:** 2026-06-23
**Status:** Implementado

---

## 1. Diagnóstico da Arquitetura Atual

### Cron existente
- Arquivo: `src/app/api/cron/sync-replies/route.ts`
- Schedule: `0 9 * * *` (diário às 9h, definido em `vercel.json`)
- Funcionamento: busca **todas** as conexões Gmail ativas → para cada usuário → sincroniza replies de todos os leads/user_leads com threads abertas

### Dashboard
- Arquivo: `src/app/(app)/dashboard/page.tsx`
- Server Component puro — sem lógica de sync, apenas lê dados do banco

### Problema identificado
O cron roda uma vez ao dia. Entre execuções, respostas recebidas no Gmail só aparecem no dashboard no dia seguinte. A janela de desatualização é de até 24h.

### Estrutura relevante: `gmail_connections`
Já existe por usuário. Contém `updated_at` (atualização de tokens) mas **não** registra quando a última sincronização de mensagens ocorreu.

---

## 2. Decisão de Design

### Onde armazenar `last_email_sync`

**Opção descartada: adicionar coluna em `gmail_connections`**
- Semanticamente impreciso: `updated_at` de `gmail_connections` reflete atualização de tokens OAuth, não de sync de mensagens
- Acoplamento: quando o Gmail for desconectado e reconectado, o histórico de sync é perdido

**Opção adotada: nova tabela `user_sync_status`**
- Independente de qualquer conexão específica
- Extensível sem refatoração: basta adicionar `last_call_sync`, `last_ai_sync`, etc.
- Não duplica nenhuma estrutura existente
- Alinhado com a evolução multicanal planejada

---

## 3. Tabela: `user_sync_status`

```sql
CREATE TABLE user_sync_status (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_email_sync timestamptz,        -- última sincronização Gmail bem-sucedida
  last_call_sync  timestamptz,        -- reservado: módulo de ligações (P2+)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_sync_status_user_unique UNIQUE (user_id)
);
```

RLS: owner-only (SELECT + INSERT + UPDATE, sem DELETE).

---

## 4. Fluxo Implementado

```
Usuário abre /dashboard
        ↓
[Server Component] getSyncStatus(user.id)
        ↓
last_email_sync existe E < 20 minutos?
        ├── SIM → getDashboardData() → renderiza
        └── NÃO → syncGmailForUser(user.id)
                        ↓
                  tem gmail_connection ativa?
                        ├── NÃO → getDashboardData() → renderiza (sem sync)
                        └── SIM → sincroniza threads/messages
                                        ↓
                                  touchEmailSync(user.id)
                                        ↓
                                  getDashboardData() → renderiza (dados frescos)
```

**Janela de cache:** 20 minutos (constante `DASHBOARD_SYNC_WINDOW_MS = 20 * 60 * 1000`)

---

## 5. Componentes Criados/Modificados

### Novo: `supabase/migrations/20260623000000_user_sync_status.sql`
Cria a tabela com RLS.

### Novo: `src/repositories/userSyncStatusRepository.ts`
- `getSyncStatus(supabase, userId)` → `UserSyncStatus | null`
- `touchEmailSync(supabase, userId)` → `void` (upsert com `last_email_sync = now()`)

### Novo: `src/services/gmailUserSyncService.ts`
- `syncGmailForUser(supabase, userId)` → `SyncResult`
- Lógica extraída do cron: busca connection, lead_ids, user_lead_ids → chama `syncGmailRepliesForLead` para cada um

### Modificado: `src/app/api/cron/sync-replies/route.ts`
- Substituiu loop manual por `syncGmailForUser()` + `touchEmailSync()`
- Reduz duplicação de código

### Modificado: `src/app/(app)/dashboard/page.tsx`
- Verifica `last_email_sync` antes de buscar dados
- Chama `syncGmailForUser` + `touchEmailSync` se stale
- O sync ocorre de forma transparente (sem UI de loading visível ao usuário — é server-side)

---

## 6. Trade-offs

| Aspecto | Situação |
|---|---|
| Latência do dashboard | Aumenta uma vez a cada 20min (durante o sync). Sem Gmail conectado: zero impacto |
| Custo de infra | ~1 req Gmail API por thread ativa, por usuário, a cada 20min (vs. 1x/dia no cron) |
| Dados frescos | Máximo de 20min de defasagem (vs. 24h antes) |
| Cron diário | Mantido como segurança e para usuários que não abrem o dashboard |

### Ineficiência conhecida (aceitável em V1)
O cron chama `syncGmailForUser()` que internamente refaz `getGmailConnection()` — uma query extra por usuário. O cron já tem a connection em memória mas não a repassa. Para V1 (poucos usuários) o custo é desprezível.

---

## 7. Evolução Futura

Quando o módulo de Calls for a P2+:
```typescript
// Adicionar à touchCallSync em userSyncStatusRepository.ts
await supabase.from('user_sync_status')
  .upsert({ user_id, last_call_sync: now, updated_at: now }, { onConflict: 'user_id' })
```

Quando houver análise de IA pós-ligação, o dashboard pode verificar:
```typescript
const needsEmailSync = isStale(syncStatus?.last_email_sync)
const needsCallSync  = isStale(syncStatus?.last_call_sync)
```

Sem refatoração da tabela ou do repositório — apenas novos métodos no repositório existente.
