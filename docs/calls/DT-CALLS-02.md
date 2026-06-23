# DT-CALLS-02 — Análise de Qualidade da Base de Telefones (`global_leads`)

**Versão:** 1.0  
**Data:** 2026-06-21  
**Objetivo:** Avaliar a cobertura e qualidade dos dados de telefone antes do lançamento do módulo de ligações.

> Consulta executada diretamente no banco de produção via service role. Snapshot em 2026-06-21.

---

## 1. Resumo Executivo

A base atual tem **509 registros** em `global_leads`. A cobertura telefônica é excepcionalmente alta (98,2%), todos os números têm DDI +55, e a conversão para E.164 estrito é trivial (sem limpeza de dados). O módulo de ligações pode ser lançado sem nenhuma migração prévia de dados.

---

## 2. Cobertura Geral

| Métrica | Contagem | % do Total |
|---|---|---|
| Total de registros | 509 | 100% |
| **Com telefone** | **500** | **98,2%** |
| Com email | 310 | 60,9% |
| Com ambos (telefone + email) | 306 | 60,1% |
| Apenas telefone (sem email) | 194 | 38,1% |
| Apenas email (sem telefone) | 4 | 0,8% |
| Sem nenhum | 5 | 1,0% |

**Leitura:** 98,2% dos leads podem ser contatados por ligação imediatamente. Os 194 leads "telefone-only" são um mercado exclusivo do canal de ligações — inacessíveis por email.

---

## 3. Qualidade dos Telefones

### 3.1 Validade

| Classificação | Contagem | % dos com telefone |
|---|---|---|
| **Válidos (número BR reconhecido)** | **500** | **100%** |
| Inválidos / não reconhecidos | 0 | 0% |

**Zero números inválidos.** Todos os 500 registros com telefone preenchido são números brasileiros válidos com prefixo `+55` e DDD reconhecível.

### 3.2 Tipo de Número

| Tipo | Contagem | % dos válidos |
|---|---|---|
| Fixo (8 dígitos locais) | 351 | 70,2% |
| Celular (9 dígitos, começa com 9) | 149 | 29,8% |

**70% são fixos.** Isso é relevante para custo Twilio: chamadas para fixo brasileiro custam ~$0,027/min vs ~$0,056/min para celular (ver CALLS_COSTS.md).

### 3.3 Formato Atual vs E.164

Todos os números estão no formato **formatado com espaços e hífens**:

```
Formato atual:  "+55 54 3212-1088"    (fixo)
                "+55 54 99912-3686"   (celular)

E.164 estrito:  "+5554321210088"
                "+5554999123686"
```

**A conversão é trivial** — basta remover espaços e hífens:

```typescript
function toE164(phone: string): string {
  return phone.replace(/[\s\-]/g, '')
  // "+55 54 3212-1088" → "+5554321210088"
}
```

Isso pode ser feito no momento da chamada em `libphonenumber-js.format(phone, 'E.164')` — sem necessidade de alterar o banco de dados.

---

## 4. Cobertura por Categoria

| Categoria | Total | Telefone | % Tel | Email | % Email |
|---|---|---|---|---|---|
| Construção Civil | 196 | 192 | 98% | 115 | 59% |
| Metalúrgica | 191 | 187 | 98% | 107 | 56% |
| Indústria Plástica | 122 | 121 | 99% | 88 | 72% |
| Restaurantes | 0 | — | — | — | — |
| Consultórios Médicos | 0 | — | — | — | — |

**Observações:**
- Cobertura telefônica homogênea entre categorias (~98–99%)
- **Indústria Plástica** tem melhor cobertura de email (72% vs 56–59% das demais)
- Restaurantes e Consultórios Médicos não têm registros ainda

---

## 5. Custo Estimado por Chamada (Twilio)

Com base na proporção fixo/celular atual:

```
70,2% fixos × R$0,15/min + 29,8% celulares × R$0,32/min
= R$0,105 + R$0,095
= R$0,20/min ponderado (duração média 4 min = R$0,80/chamada)
```

Isso é **mais barato que o estimado em CALLS_COSTS.md** (que assumia 80% celular). A base atual sugere um custo médio por chamada ~15% menor.

---

## 6. Impacto no Módulo de Ligações

### ✅ Pontos positivos

- **Cobertura imediata**: 98,2% dos leads podem ser ligados sem nenhuma coleta adicional de dados
- **Dados limpos**: 0 números inválidos — o risco R5 (CALLS_RISKS.md) é mais baixo que o esperado
- **Normalização trivial**: `libphonenumber-js` + `.replace(/[\s\-]/g, '')` é suficiente
- **DDI já preenchido**: todos têm `+55`, sem necessidade de inferir country code
- **Custo menor**: maioria fixo → tarifa Twilio mais barata

### ⚠️ Pontos de atenção

- **194 leads sem email**: nunca receberam contato. A ligação será o primeiro contato. Pode impactar taxa de atendimento.
- **Fixos vs celulares**: fixos têm menor taxa de atendimento em prospecção B2B — o usuário deve estar ciente.
- **Snapshot**: esta análise reflete a base atual. À medida que novos leads são importados, a qualidade pode variar.

---

## 7. Recomendações

### Para o Módulo de Ligações (imediatas)

1. **Não migrar dados** — nenhuma alteração de schema necessária para lançar a Fase 3+.
2. **Usar `libphonenumber-js` no modal** — normalizar para E.164 no frontend antes de enviar para `/api/calls/token`.
3. **Exibir tipo de número** (fixo/celular) no modal de ligação — o usuário pode decidir se liga para fixo ou espera ter celular.

### Para o Futuro (baixa prioridade)

4. **Colunas `phone_e164` e `phone_validated`** (documentadas em CALLS_DATABASE.md) — úteis quando a base crescer e precisar de queries eficientes por número.
5. **Relatório mensal de qualidade** — monitorar a % de phones válidos à medida que novas categorias/cidades são importadas.

---

## 7. Classificação sob a Nova Política de Qualidade

Com base nas decisões documentadas em [DT-CALLS-03.md](DT-CALLS-03.md), os 509 leads existentes se classificam como:

| Classificação | Contagem | % | Canais disponíveis |
|---|---|---|---|
| `complete` (tel + email) | 306 | 60,1% | Email + Ligação |
| `partial_phone` (só telefone) | 194 | 38,1% | Ligação apenas |
| `partial_email` (só email) | 4 | 0,8% | Email apenas |
| `invalid` (nenhum canal) | 5 | 1,0% | Nenhum — não deveria estar ativo |

### Ação recomendada

Os **5 registros `invalid`** estão em `global_leads` com `status = active` e não possuem nenhum canal de contato válido. Devem ser marcados como `status = invalid` em uma tarefa futura de limpeza de dados — antes do lançamento do módulo de Calls para não expor leads sem canal ao usuário.

### Distribuição atual vs meta 70/30

| | Atual | Meta V2 |
|---|---|---|
| Leads complete | 60,1% | 70% |
| Leads partial | 39,9% | 30% |

A base atual está levemente invertida em relação à meta — 39,9% parciais vs meta de 30%. O pipeline de enriquecimento via n8n (DT-CALLS-03) deve elevar a taxa de `complete` ao importar novos leads.

---

## 8. Metodologia

Queries executadas via `@supabase/supabase-js` com service role key contra o banco de produção:

```
Total: SELECT count(*) FROM global_leads
Com telefone: WHERE phone IS NOT NULL AND phone != ''
Com email: WHERE email IS NOT NULL AND email != ''
Com ambos: WHERE phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != ''
Validade: strip \D, checar 12 ou 13 dígitos começando com '55'
Tipo: 12 dígitos = fixo, 13 dígitos = celular
Categoria: GROUP BY category_id + join lead_categories
```
