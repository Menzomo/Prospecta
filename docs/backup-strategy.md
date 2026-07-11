# Backup Strategy — Prospecta

## Visão Geral

A estratégia de backup protege dois ativos críticos: o banco de dados Supabase (PostgreSQL) e os arquivos do Storage (gravações de chamadas). Os dados financeiros da wallet exigem atenção especial por serem imutáveis por design.

---

## 1. Banco de Dados (Supabase PostgreSQL)

### 1.1 Backups automáticos (Supabase)

| Plano | Frequência | Retenção | Tipo |
|-------|-----------|----------|------|
| Free  | Diário    | 7 dias   | Point-in-time snapshot |
| Pro   | Diário + WAL contínuo | 30 dias | PITR (point-in-time recovery) |

**Ação recomendada**: migrar para o plano **Pro** antes do lançamento V1. O PITR permite restaurar para qualquer segundo dentro da janela de 30 dias — essencial para auditorias financeiras.

### 1.2 Backup manual antes de migrações críticas

Antes de executar qualquer migration que altere tabelas financeiras (`wallet_balances`, `wallet_transactions`, `wallet_holds`):

```bash
# Via Supabase CLI (requer service role)
supabase db dump --db-url "$DATABASE_URL" > backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql
```

Armazenar esses dumps em um bucket S3 ou equivalente fora do Supabase.

### 1.3 Tabelas críticas (nunca apagar sem backup verificado)

| Tabela | Motivo |
|--------|--------|
| `wallet_balances` | Saldo atual de todos os usuários |
| `wallet_transactions` | Ledger financeiro imutável — fonte de verdade |
| `wallet_holds` | Reservas ativas (dinheiro comprometido, ainda não liquidado) |
| `profiles` | Flags de onboarding e cota de leads |
| `calls` | Histórico de ligações cobradas |
| `call_analyses` | Resultados de IA (custo de processamento) |

---

## 2. Storage (Gravações de Chamadas)

### 2.1 Política de retenção atual

- Gravações são transferidas do Twilio para o bucket `call-recordings` no Supabase Storage.
- `recording_expires_at` = `ended_at` + 15 dias (fase 4 do CALLS_ROADMAP).
- Após expirar, a gravação pode ser removida para reduzir custos.

### 2.2 Recomendação futura

Configurar replicação do bucket para um S3 externo (AWS ou Cloudflare R2) para gravações de usuários pagantes. Custo de armazenamento no Supabase Storage é maior que S3 para volumes altos.

---

## 3. Reconciliação Financeira

O ledger (`wallet_transactions`) é protegido por regras de banco que bloqueiam DELETE e UPDATE (`no_delete_wallet_tx`, `no_update_wallet_tx`). Isso garante que:

- Nenhum registro financeiro pode ser alterado após inserção, mesmo pelo service role via SQL direto.
- Qualquer estorno é registrado como uma nova linha positiva (tipo `hold_refund`), nunca como deleção.

### 3.1 Verificação de integridade diária (recomendado)

```sql
-- Detecta divergências entre o ledger e o saldo em cache
SELECT
  wb.user_id,
  wb.balance AS cached_balance,
  COALESCE(SUM(wt.amount), 0) AS ledger_balance,
  wb.balance - COALESCE(SUM(wt.amount), 0) AS drift
FROM wallet_balances wb
LEFT JOIN wallet_transactions wt ON wt.user_id = wb.user_id
GROUP BY wb.user_id, wb.balance
HAVING wb.balance <> COALESCE(SUM(wt.amount), 0);
```

Se houver drift: o ledger é a fonte de verdade. Restaurar `wallet_balances` com `SUM(wallet_transactions.amount)` por usuário.

### 3.2 Reconciliação de holds expirados (cron)

O cron de reconciliação (`expire_wallet_holds`) deve rodar a cada hora:

```sql
SELECT expire_wallet_holds();
```

Retorna a contagem de holds processados. Se retornar > 0 com frequência alta, investigar latência do webhook Twilio.

---

## 4. Plano de Recuperação de Desastre (RTO/RPO)

| Cenário | RPO | RTO | Ação |
|---------|-----|-----|------|
| Corrupção de dados em tabela financeira | < 1 segundo (PITR Pro) | ~30 min | Restaurar via PITR no painel Supabase |
| Drop acidental de tabela `wallet_transactions` | < 1 dia (backup diário) | ~1h | Restaurar do último snapshot + replay de eventos |
| Indisponibilidade do Supabase | — | dependente do SLA | Usuários não conseguem ligar (block no token de chamada) — sem perda de dados |
| Webhook Twilio não processado | — | até 2h | `expire_wallet_holds()` estorna automaticamente a reserva |

---

## 5. Checklist pré-lançamento V1

- [ ] Supabase Pro ativo (PITR habilitado)
- [ ] Variáveis de ambiente de produção em `.env.production` (não no repositório)
- [ ] `DATABASE_URL` de produção guardada em local seguro fora do Git
- [ ] Backup manual do banco antes da primeira migration de wallet em produção
- [ ] Script de verificação de integridade agendado (query acima)
- [ ] Alerta configurado se `expire_wallet_holds()` retornar > 5 holds expirados por hora
