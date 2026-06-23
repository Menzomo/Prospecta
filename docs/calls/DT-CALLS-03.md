# DT-CALLS-03 — Estratégia de Qualidade, Enriquecimento e Distribuição de Leads

**Versão:** 1.0  
**Data:** 2026-06-22  
**Status:** Aprovado — documentação apenas, nenhuma implementação iniciada

> Este documento formaliza as decisões de produto tomadas após a análise DT-CALLS-02 e a definição do módulo de Calls. Todas as alterações descritas aqui são documentais nesta etapa. Nenhuma migration, tabela, endpoint ou código deve ser criado antes da aprovação formal de implementação.

---

## 1. Contexto

Com a adição do canal de Ligações (V2), o Prospecta passa a operar com dois canais de prospecção:

| Canal | Dado necessário |
|---|---|
| Email | `email` preenchido e válido |
| Ligação | `phone` preenchido e válido |

A qualidade da base de leads em `global_leads` deixa de ser apenas "tem email?" e passa a ser "tem ao menos um canal de contato válido?". Isso exige uma revisão da política de publicação, do fluxo de enriquecimento e da estratégia de distribuição para usuários.

---

## 2. Política de Publicação de Leads

### Regra fundamental

> **Um lead só pode ser publicado em `global_leads` se possuir ao menos um canal de contato válido (email OU telefone).**

| Cenário | Publicar? |
|---|---|
| Tem telefone + email | ✅ Sim |
| Tem apenas telefone | ✅ Sim |
| Tem apenas email | ✅ Sim |
| Sem telefone e sem email | ❌ Nunca |

### Fluxo de transição para o estado publicado

```
Lead importado (Apify / CSV / futuro)
    ↓
[Estado: pending_enrichment]
    ↓
n8n tenta enriquecer dados
    ↓
    ├── Encontrou email? → salva email
    ├── Encontrou telefone? → salva telefone
    ↓
[Estado: pending_review]
    ↓
Admin revisa e aprova
    ↓
[Estado: active] ← publicado em global_leads para usuários
```

### Imutabilidade de campos de identidade

Após a publicação, campos de **identidade** não devem ser alterados — isso quebraria a deduplicação e poderia criar inconsistências:

| Campo | Tipo | Mutável após publicação? |
|---|---|---|
| `company_name` | Identidade | ❌ Não |
| `city` | Identidade | ❌ Não |
| `state` | Identidade | ❌ Não |
| `website` | Identidade | ❌ Não |
| `provider_external_id` | Identidade | ❌ Não |
| `email` | Contato | ✅ Sim (enriquecimento) |
| `phone` | Contato | ✅ Sim (enriquecimento) |
| `category_id` | Classificação | ❌ Não (impacta distribuição) |

> **Por que imutabilidade importa para deduplicação:** ao importar um novo lead, o sistema verifica existência via `company_name + city` (ver `findGlobalLeadByNameAndCity`) e via `website`. Se o campo for alterado após publicação, a próxima importação do mesmo lead real pode não encontrar o registro existente, criando uma duplicata.

---

## 3. Classificação de Qualidade de Leads

### Definição dos níveis

| Classificação | Condição | Descrição |
|---|---|---|
| `complete` | Tem telefone AND email | Lead acessível por qualquer canal |
| `partial_phone` | Tem telefone, sem email | Apenas canal de ligação disponível |
| `partial_email` | Tem email, sem telefone | Apenas canal de email disponível |
| `invalid` | Sem telefone e sem email | Não publicável — aguarda enriquecimento |

> Nota de implementação futura: este conceito será mapeado para um novo valor em `lead_quality_status` ou para uma coluna separada `channel_availability`. Nenhuma alteração de schema é feita agora.

### Estado da base atual (snapshot 2026-06-21)

Ver análise completa em [DT-CALLS-02.md](DT-CALLS-02.md).

| Classificação | Contagem | % |
|---|---|---|
| `complete` (tel + email) | 306 | 60,1% |
| `partial_phone` (só tel) | 194 | 38,1% |
| `partial_email` (só email) | 4 | 0,8% |
| `invalid` (nenhum) | 5 | 1,0% |

**Os 5 registros `invalid` não deveriam estar em `global_leads` com `status = active`** — serão tratados em uma tarefa futura de limpeza de dados.

---

## 4. Enriquecimento Automático via n8n

### Objetivo

Maximizar a taxa de leads `complete` antes da publicação, reduzindo a necessidade de intervenção manual do admin e aumentando o valor entregue ao usuário final.

### Fluxo de enriquecimento

```
[Lead com dados incompletos entra na fila]
    ↓
[n8n — Nível 1: Scraping sem IA]
    │
    ├── GET website da empresa
    ├── Extração de emails do HTML (regex: href="mailto:...")
    ├── Extração de telefones do HTML (regex: padrões BR)
    ├── GET /contato, /fale-conosco, /contact (páginas comuns)
    ├── Extração de emails/telefones nessas páginas
    └── Extração de links de redes sociais para fallback
    │
    ├─── Encontrou email? → salva, encerra pipeline
    ├─── Encontrou telefone? → salva, encerra pipeline
    ↓
[n8n — Nível 2: IA como fallback]
    │
    ├── Envia HTML das páginas para Gemini 1.5 Flash
    ├── Prompt: "Identifique email comercial e telefone de contato deste negócio"
    ├── Parse resposta JSON
    └── Salva se encontrou
    │
    └─── Não encontrou nada? → lead permanece em pending_review sem dados extras
```

### Princípio de custo

> **IA é o último recurso, não o primeiro.**

O Nível 1 (scraping puro) resolve a maioria dos casos sem custo de IA. O Gemini só é acionado quando o scraping falha — reduzindo o custo por lead enriquecido de ~R$0,10 para ~R$0,01-0,02 (a maioria dos leads resolvida por regex, Gemini usado em ~15-20% dos casos estimados).

### Infraestrutura

O mesmo n8n utilizado para análise de ligações (ver [CALLS_ARCHITECTURE.md](CALLS_ARCHITECTURE.md)) será reutilizado para o enriquecimento. Workflows separados, mesma instância:

| Workflow | Trigger | Propósito |
|---|---|---|
| `lead-enrichment-pipeline` | Novo lead em fila / cron | Enriquecer email + telefone |
| `call-analysis-pipeline` | POST do Prospecta após ligação | Analisar gravação com IA |

---

## 5. Estratégia de Distribuição para Usuários

### V1 — Sem filtros de qualidade

Na versão inicial do módulo de Calls, **o usuário não terá controle sobre o tipo de leads recebidos.** Toda a lógica de balanceamento é responsabilidade do Prospecta.

**Razão:** introduzir filtros na V1 cria complexidade de UX desnecessária e aumenta o risco de o usuário não entender por que não recebe leads.

### Meta operacional — Distribuição 70/30

O sistema deve garantir que, em cada lote de leads entregues, a composição seja aproximadamente:

| Tipo | Meta |
|---|---|
| `complete` (tel + email) | **70%** |
| `partial_*` (um canal) | **30%** |
| `invalid` | 0% (nunca entregar) |

**Exemplo prático — Busca de 50 leads:**
```
50 leads entregues ≈
  35 complete  (têm email + telefone)
  15 partial   (têm email OU telefone)
   0 invalid
```

### Ordem de prioridade na entrega

Quando o sistema busca leads para um usuário (`findAvailableGlobalLeadsForUser`):

```
1. Priorizar leads complete
2. Complementar com partial_phone (canal calls disponível)
3. Complementar com partial_email (canal email disponível)
4. Nunca entregar invalid
```

> Nota de implementação: a lógica de priorização pode ser implementada como múltiplas queries com `ORDER BY` e `LIMIT` ponderados, ou como uma query única com `CASE WHEN ... END` no `ORDER BY`. Decisão de implementação para Fase 2+.

---

## 6. Prevenção de Leads Duplicados

### Problema

Um lead pode existir em `global_leads` com `partial_phone` (só telefone). Depois de publicado, o enriquecimento encontra o email e atualiza o registro para `complete`. Se um novo import tentar inserir o mesmo lead (agora com ambos os canais), como evitar duplicação?

### Solução adotada

**Regra: sempre atualizar o registro existente, nunca criar um novo para o mesmo lead real.**

Mecanismo atual (já implementado):
- `findGlobalLeadByNameAndCity(companyName, city)` — deduplicação por nome+cidade
- `findGlobalLeadByWebsite(website)` — deduplicação por website
- `findGlobalLeadByProviderExternalId(source, id)` — deduplicação por ID externo (Apify)

Se qualquer um desses retornar um registro existente → `UPDATE` os campos de contato, nunca `INSERT`.

### Enriquecimento não cria duplicatas

Quando o enriquecimento encontra um email para um lead `partial_phone`:
- ✅ `UPDATE global_leads SET email = '...', lead_quality_status = 'complete' WHERE id = $1`
- ❌ ~~`INSERT INTO global_leads (...) VALUES (...)`~~

Usuários que já possuem esse lead (via `user_leads`) automaticamente passam a ter acesso ao canal email. Isso é intencional — é um enriquecimento, não um novo lead.

---

## 7. Opções para Distribuição Multi-Canal (V2+)

Esta seção documenta as opções avaliadas para versões futuras, quando o usuário poderá ter controle sobre como recebe leads por canal.

### Problema central

Se um usuário receber um lead `partial_phone` e contatá-lo por ligação, depois o mesmo lead for enriquecido com email: como evitar que o usuário "receba de novo" esse lead na busca por email?

**Resposta:** não é um problema. O lead já está em `user_leads` com `global_lead_id` vinculado. Quando o usuário busca novos leads, a query exclui todos os leads já em `user_leads` do usuário — independente de canal. O usuário nunca verá o mesmo `global_lead` duas vezes.

### Opções para versões futuras

#### Opção F1 — Filtros pelo usuário (sem duplicação)

O usuário pode selecionar:
- "Prefiro leads com email" → prioridade para `complete` e `partial_email`
- "Prefiro leads com telefone" → prioridade para `complete` e `partial_phone`
- "Qualquer canal" → distribuição padrão 70/30

**Vantagem:** controle fino para usuários que usam só email ou só ligação.  
**Desvantagem:** complexidade de UX, possibilidade de o usuário "esgotar" um tipo.  
**Duplicação:** não há risco — a exclusão de leads já possuídos é universal.

#### Opção F2 — Cross-channel awareness

Quando o usuário busca leads e um lead disponível já foi contatado por um canal diferente (via outro usuário — o que não é possível, pois leads são exclusivos):

> Não aplicável — cada lead em `user_leads` pertence a exatamente um usuário. Um lead nunca é compartilhado entre usuários diferentes.

#### Opção F3 — Expansão de canal para leads já possuídos

Quando um lead já possuído (`partial_phone`) recebe email via enriquecimento, notificar o usuário:
- "O lead [Empresa X] agora tem email disponível — deseja adicionar ao canal email?"
- Interface: badge na página do lead, notificação no dashboard

**Vantagem:** maximiza o valor de leads já adquiridos.  
**Implementação:** cron que verifica leads de usuários com enriquecimento recente + notificação in-app.

**Recomendação para V2:** implementar F1 + F3 juntos — filtros na busca + notificação de enriquecimento para leads existentes.

---

## 8. Impacto no Módulo Calls

Com a classificação de leads por canal, o módulo de Calls deve:

### 8.1 Botão "Ligar" — comportamento por tipo

| Tipo de lead | Comportamento |
|---|---|
| `complete` | Botão "Ligar" habilitado, botão "Enviar Email" habilitado |
| `partial_phone` | Botão "Ligar" habilitado, "Enviar Email" desabilitado (tooltip: "Lead sem email cadastrado") |
| `partial_email` | Botão "Ligar" desabilitado (tooltip: "Lead sem telefone cadastrado"), "Enviar Email" habilitado |
| `invalid` | Ambos desabilitados — não deveria chegar ao usuário |

### 8.2 Dashboard e métricas (Fase 8)

Com a classificação, será possível medir:

```
Leads por canal
├── Apenas email:  X%
├── Apenas calls:  Y%
└── Ambos:         Z%

Conversões por canal
├── Taxa de resposta email
├── Taxa de atendimento chamada
└── Taxa de resposta email vs chamada (comparativo)
```

### 8.3 Sem alterações na arquitetura principal

A classificação `complete/partial/invalid` é derivável dos campos `email` e `phone` já existentes — nenhuma nova coluna é obrigatória para o funcionamento do V2. A coluna `channel_availability` ou novo valor de `lead_quality_status` é otimização futura.

---

## 9. Referências

| Documento | Conteúdo |
|---|---|
| [DT-CALLS-01.md](DT-CALLS-01.md) | Decisão técnica WebRTC vs Click-to-Call |
| [DT-CALLS-02.md](DT-CALLS-02.md) | Análise quantitativa da base atual |
| [CALLS_ARCHITECTURE.md](CALLS_ARCHITECTURE.md) | Arquitetura do módulo de Calls |
| [CALLS_DATABASE.md](CALLS_DATABASE.md) | Schema de banco de dados |
| [CALLS_ROADMAP.md](CALLS_ROADMAP.md) | Roadmap de implementação |
| [CALLS_RISKS.md](CALLS_RISKS.md) | Riscos, inconsistências e oportunidades |
