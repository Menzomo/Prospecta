# CALLS_COSTS.md — Análise de Custos

**Versão:** 1.0  
**Data:** 2026-06-21

> Preços em USD convertidos para BRL à cotação aproximada de R$5,70 por dólar.  
> Preços Twilio são referência — variam por contrato e volume.

---

## Modelo de Custo para o Prospecta

O Prospecta **não paga pela telefonia**. Cada usuário usa sua própria conta Twilio. O Prospecta cobra apenas por **análises de IA**, que envolvem custo de infraestrutura marginal (Gemini + n8n + Storage).

---

## 1. Custos Suportados pelo USUÁRIO (conta Twilio própria)

### Twilio — Tarifas por Chamada (Brasil)

| Destino | USD/min | BRL/min (approx.) |
|---|---|---|
| Celular brasileiro (+55 11 9...) | $0.056 | ~R$0,32 |
| Fixo brasileiro (+55 11 3...) | $0.027 | ~R$0,15 |
| Celular Brasil via número BR | $0.030 | ~R$0,17 |

> Número Twilio com prefixo +55 (nacional) tem tarifa menor e mais credibilidade para o lead. Recomendado.

### Twilio — Número Mensal

| Tipo de Número | USD/mês | BRL/mês |
|---|---|---|
| EUA (+1) | $1.15 | ~R$6,50 |
| Brasil (+55) | $2.00–$4.00 | ~R$11–23 |

### Twilio — Gravação

| Item | Custo |
|---|---|
| Armazenamento na Twilio | $0.0025/min gravado |
| Download (transferência para Supabase) | Grátis (incluso no plano) |

> Na nossa arquitetura, transferimos o áudio para o Supabase Storage e deletamos da Twilio em seguida — custo de armazenamento Twilio tende a zero.

### Estimativa Mensal — Usuário Típico

Cenário: 50 ligações/mês, duração média 4 minutos, 80% celular, 20% fixo

```
Ligações celular: 40 × 4min × $0.056 = $8.96
Ligações fixo:    10 × 4min × $0.027 = $1.08
Número BR (+55):                      = $2.00
Gravação Twilio:  (transferida imediatamente) ≈ $0.10
─────────────────────────────────────────────
Total USD: ~$12.14/mês ≈ R$69/mês na conta Twilio do usuário
```

**O usuário paga isso diretamente para o Twilio. O Prospecta não intermedia.**

---

## 2. Custos Suportados pelo PROSPECTA (infraestrutura de IA)

### Gemini 1.5 Flash (via n8n)

| Item | Custo |
|---|---|
| Input de áudio | $0.000075/segundo (~$0.0045/min) |
| Output de texto (análise) | $0.30/1M tokens (~1.000 tokens por análise = $0.0003) |
| **Custo por análise (4 min)** | **~$0.018 ≈ R$0,10** |

> Gemini 1.5 Flash processa áudio nativamente — sem necessidade de transcrição separada (Whisper), reduzindo custos.

### n8n Cloud (se não self-hosted)

| Plano | USD/mês | Execuções incluídas |
|---|---|---|
| Starter | $24 | 5.000/mês |
| Pro | $60 | 25.000/mês |

> Para o volume inicial (<500 análises/mês), o plano Starter é suficiente.  
> **Alternativa preferida:** n8n self-hosted em VPS (~$5/mês na DigitalOcean) — sem limite de execuções.

### Supabase Storage

| Item | Custo |
|---|---|
| Primeiros 1 GB | Grátis (plano Pro Supabase inclui 100 GB) |
| MP3 de 4 min (128kbps) | ~3.8 MB |
| 200 gravações ativas | ~760 MB |

> Com retenção de 15 dias e 200 usuários com 50 ligações/mês, o pico de storage é ~7.6 GB — dentro do plano atual.

### Resumo de Custo por Análise (para o Prospecta)

| Componente | Custo por análise |
|---|---|
| Gemini 1.5 Flash | R$0,10 |
| n8n (self-hosted) | ~R$0,05 (rateado) |
| Supabase Storage | ~R$0,01 |
| **Total** | **~R$0,16 por análise** |

---

## 3. Modelo de Receita

### Plano Starter (proposto)

| Item | Valor |
|---|---|
| Preço mensal | R$120/mês |
| Leads incluídos | 200 |
| Emails | Ilimitados |
| Análises de chamada | 200 |

### Margem sobre Análises

| Cenário | Análises usadas | Receita | Custo infra IA | Margem bruta análises |
|---|---|---|---|---|
| Uso baixo | 50 | R$120 | R$8 | R$112 |
| Uso médio | 120 | R$120 | R$19 | R$101 |
| Uso total | 200 | R$120 | R$32 | R$88 |

> Mesmo no uso máximo, a margem bruta se mantém acima de 70% apenas considerando o custo de IA.

### Créditos Extras (futuro)

Pacote de 100 análises adicionais:

| Preço sugerido | Custo infra | Margem |
|---|---|---|
| R$39,90 | ~R$16 | ~60% |

---

## 4. Comparativo — Self-hosted n8n vs n8n Cloud

| | Self-hosted | n8n Cloud Starter |
|---|---|---|
| Custo | ~R$30/mês (VPS) | ~R$137/mês |
| Manutenção | Requer updates manuais | Zero |
| Limite de execuções | Ilimitado | 5.000/mês |
| Confiabilidade | Depende do VPS | SLA Garantido |
| Recomendação para V2 | ✅ Preferido | Só se não quiser ops |

---

## 5. Projeção de Breakeven

Considerando custo fixo de infraestrutura Prospecta:

| Componente | Custo mensal |
|---|---|
| Supabase Pro | ~R$125 (já existente) |
| n8n self-hosted | ~R$30 |
| Vercel Pro | ~R$100 (já existente) |
| **Total infra** | **~R$255/mês** |

| Usuários pagantes | Receita | Custo infra total | Lucro |
|---|---|---|---|
| 3 | R$360 | R$255 + R$48 IA | R$57 |
| 5 | R$600 | R$255 + R$80 IA | R$265 |
| 10 | R$1.200 | R$255 + R$160 IA | R$785 |
| 20 | R$2.400 | R$255 + R$320 IA | R$1.825 |

**Breakeven: 3 usuários pagantes** com uso médio de análises.
