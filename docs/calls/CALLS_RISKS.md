# CALLS_RISKS.md — Riscos, Inconsistências e Oportunidades

**Versão:** 1.0  
**Data:** 2026-06-21

---

## 1. Riscos Técnicos

### R1 — Compatibilidade Safari/iOS com WebRTC
**Probabilidade:** Média | **Impacto:** Alto

Safari 14.5+ suporta WebRTC, mas com restrições:
- `getUserMedia` (acesso ao microfone) deve ser iniciado por gesto do usuário — não pode ser chamado de forma programática.
- Em iOS, a API de áudio pode ser suspensa quando o app vai para segundo plano (ligação cai se usuário muda de app).
- Twilio Voice SDK testado e documentado para Safari, mas issues reportados na comunidade com versões iOS menores.

**Mitigação:**
- Detectar browser e exibir aviso se versão não suportada.
- Testar explicitamente em iOS Safari antes de cada release.
- Oferecer Click-to-Call como fallback manual para usuários em iOS com problemas.

---

### R2 — Credenciais Twilio do Usuário
**Probabilidade:** Baixa | **Impacto:** Crítico

O Auth Token Twilio é uma credencial de alto privilégio. Se vazado, o atacante pode:
- Fazer chamadas na conta do usuário (custo financeiro)
- Acessar gravações de chamadas
- Manipular configurações Twilio

**Mitigação:**
- Criptografar com AES-256-GCM antes de salvar no banco.
- `TELEPHONY_MASTER_KEY` nunca no banco — apenas variável de ambiente Vercel.
- Descriptografia ocorre apenas no servidor, em Route Handlers autenticados.
- Nunca expor Auth Token descriptografado em logs.
- Rotação da chave mestra: documentar processo de re-encriptação sem downtime.

---

### R3 — Validação de Assinatura Twilio
**Probabilidade:** Baixa | **Impacto:** Alto

Endpoints `/api/calls/twiml` e `/api/calls/status` recebem POSTs do Twilio. Sem validação de assinatura, qualquer pessoa pode fazer POST e criar registros falsos de chamadas.

**Mitigação:**
- Implementar `twilio.validateRequest()` em ambos os endpoints.
- Retornar HTTP 403 se assinatura inválida — nunca processar.
- Não esquecer que no Vercel, a URL base pode diferir entre prod e preview — usar `NEXT_PUBLIC_APP_URL` na validação.

---

### R4 — Condição de Corrida em Créditos
**Probabilidade:** Média | **Impacto:** Médio

Se o usuário clicar "Analisar" múltiplas vezes rapidamente (ou se duas instâncias do browser deduzirem ao mesmo tempo), créditos podem ser debitados além do saldo.

**Mitigação:**
- UPDATE atômico: `UPDATE analysis_credits SET credits_used = credits_used + 1 WHERE credits_used < credits_total RETURNING id`
- Se a query retornar 0 linhas: crédito esgotado, retornar erro.
- Nunca: SELECT → verificar → INSERT/UPDATE em duas queries separadas.
- Constraint `credits_used <= credits_total` no banco como última linha de defesa.

---

### R5 — Qualidade dos Números de Telefone na Base
**Probabilidade:** ~~Alta~~ **Baixa** (revisado após DT-CALLS-02) | **Impacto:** Médio

> **Atualização 2026-06-22:** Análise da base atual (DT-CALLS-02) revelou que 100% dos 500 registros com telefone são números brasileiros válidos com DDI `+55`. Risco rebaixado para a base existente. Permanece válido para novos lotes importados.

A base atual usa o formato `"+55 54 3212-1088"` — válido mas não E.164 estrito. Conversão trivial:
```typescript
phone.replace(/[\s\-]/g, '')  // "+55 54 3212-1088" → "+5554321210088"
```

**Mitigação:**
- Usar `libphonenumber-js` para normalizar E.164 antes de cada chamada.
- Exibir o número formatado para confirmação visual do usuário antes de ligar.
- Permitir edição do número no modal de ligação (campo pré-preenchido mas editável).
- Pipeline de enriquecimento via n8n valida telefone antes de publicar novos leads (DT-CALLS-03).

---

### R6 — Dependência do n8n para IA
**Probabilidade:** Baixa | **Impacto:** Médio

Se o n8n ficar fora do ar, análises ficam travadas em `status: pending`. O usuário não recebe o relatório.

**Mitigação:**
- Retry automático no n8n (já incluído no roadmap: 3 tentativas, backoff exponencial).
- Cron no Prospecta que verifica análises `pending` há mais de 30 min e re-dispara o webhook.
- Dashboard de monitoramento do n8n (alerta no Slack ou email quando workflow falha).
- Caso extremo: interface admin para re-processar análises manualmente.

---

### R7 — Custos de IA em Escala
**Probabilidade:** Baixa (no início) | **Impacto:** Alto (se não monitorado)

Gemini 1.5 Flash é barato para o volume inicial. Mas se o modelo mudar de preço ou o uso escalar muito, os custos podem erodir a margem.

**Mitigação:**
- Configurar billing alerts na conta Google Cloud.
- Arquitetura model-agnostic já planejada — troca de modelo não exige re-implementação.
- Monitorar `credits_used` vs `ai_processing_cost` (adicionar campo de custo em `call_analyses` no futuro).

---

## 2. Riscos Legais (LGPD e Telecomunicações)

### R8 — Gravação de Chamadas e Consentimento
**Probabilidade:** Alta | **Impacto:** Alto

**Marco Legal:**
- **Lei das Interceptações (Lei 9.296/1996):** Proíbe interceptação de comunicações *sem conhecimento* de qualquer dos participantes. A gravação por um dos participantes (o vendedor) **com ciência própria** é geralmente considerada lícita.
- **Código Civil / CDC:** Em contexto B2B, a legislação é mais permissiva, mas boa prática exige aviso.
- **LGPD (Lei 13.709/2018):** Gravações de voz são dados pessoais. Retenção deve ser justificada e informada na Política de Privacidade.

**Recomendação:**
- Exibir aviso ao lead no início da chamada: "Esta ligação poderá ser gravada para fins de análise." (via Twilio `<Say>` no TwiML, automático).
- Dar opção ao usuário de desativar gravação por ligação.
- Atualizar Termos de Uso e Política de Privacidade do Prospecta antes do lançamento.
- Consultar advogado especializado em LGPD — este documento não substitui assessoria jurídica.

---

### R9 — Retenção e Direito ao Esquecimento
**Probabilidade:** Média | **Impacto:** Médio

A LGPD garante ao titular o direito de solicitar exclusão de dados pessoais. Um lead pode solicitar que suas gravações sejam deletadas.

**Mitigação:**
- Retenção de 15 dias para áudio já é conservadora — bem abaixo do máximo razoável.
- Transcrição e análise ficam permanentemente — adicionar botão "Excluir transcrição" no relatório.
- Documentar processo de atendimento a solicitações LGPD (email para `privacidade@prospecta.com.br`).
- Criar tarefa futura: implementar "Excluir dados deste lead" que apaga todos os registros associados.

---

## 3. Riscos de Produto

### R10 — Adoção da Funcionalidade
**Probabilidade:** Média | **Impacto:** Médio

Usuários precisam configurar uma conta Twilio (SID, Auth Token, número). Isso pode ser uma barreira significativa de onboarding para o canal de ligações.

**Mitigação:**
- Criar guia passo a passo dentro do Prospecta (não só documentação externa).
- Oferecer vídeo tutorial de configuração Twilio.
- Considerar no futuro um "modo simplificado" onde o Prospecta atua como intermediário Twilio (modelo de receita diferente).

---

### R11 — Qualidade da Transcrição em Português Brasileiro
**Probabilidade:** Média | **Impacto:** Médio

Gemini 1.5 Flash tem boa performance em português, mas chamadas telefônicas têm ruído, sotaques regionais, e qualidade de áudio inferior a gravações de estúdio.

**Mitigação:**
- Incluir instrução explícita no prompt: "Ignore ruídos de fundo. Se parte do áudio não for compreensível, marque como [inaudível]."
- Exibir disclaimer no relatório: "Transcrição gerada automaticamente — pode conter imprecisões."
- Coletar feedback do usuário ("Esta análise foi útil?") para monitorar qualidade ao longo do tempo.

---

## 4. Inconsistências Identificadas no Codebase Atual

### I1 — Dual Lead Model sem Constraint Centralizado
**Arquivo:** Múltiplos (`followups`, `email_messages`, `email_threads`)  

O padrão `lead_id XOR user_lead_id` já é usado, mas cada tabela implementa a constraint individualmente. Se uma nova tabela for criada sem essa constraint, leads podem ficar sem associação ou com associação dupla.

**Recomendação:** Documentar o padrão em `docs/conventions.md` e criar checklist de review para novas tabelas.

---

### I2 — `profiles.phone` vs `company_profiles.phone` vs `leads.phone`
**Arquivos:** `leads`, `company_profiles`, e futuro `telephony_settings`

Há três lugares onde "número de telefone" pode aparecer com propósitos diferentes:
- `company_profiles.phone` → telefone da empresa do usuário (para assinatura de email)
- `telephony_settings.phone_number` → número Twilio para fazer chamadas
- `leads.phone` → número do lead para ligar

A UI pode confundir o usuário se não ficar claro qual número é usado para quê.

**Recomendação:** Labels distintos nas configurações: "Número da empresa (aparece nos emails)" vs "Número Twilio (para fazer ligações pelo Prospecta)".

---

### I3 — `followups.type` tem apenas `manual` e `no_reply`
**Arquivo:** `src/types/followups.ts`

Com o módulo de ligações, surgirá um terceiro tipo natural: `post_call` (followup gerado após análise de ligação). Não adicionar agora, mas deixar documentado.

**Recomendação:** Quando for implementar (Fase 7), adicionar `post_call` como valor válido e ajustar a UI de followups para exibir a origem corretamente.

---

### I4 — `status` de `calls` é sincronizado do Twilio mas pode ficar stale
**Detalhe técnico**

O Twilio envia status callbacks, mas se o callback falhar (network error, deploy em andamento), o registro `calls.status` fica em `initiated` para sempre.

**Recomendação:** Cron de reconciliação que busca chamadas em `initiated` ou `ringing` há mais de 1 hora e atualiza status via Twilio API (`GET /Calls/{CallSid}`).

---

## 4. Riscos de Enriquecimento e Qualidade (Adicionados em DT-CALLS-03)

### R12 — Confiabilidade do Pipeline de Enriquecimento (n8n)
**Probabilidade:** Baixa | **Impacto:** Médio

O n8n agora tem duas responsabilidades críticas: enriquecimento de leads (Nível 1 + Nível 2 IA) e análise de chamadas. Se o n8n ficar fora do ar, ambos os pipelines param.

**Mitigação:**
- Monitoramento de saúde do n8n com alerta (Slack/email).
- Cron no Prospecta que verifica leads em `pending_enrichment` há mais de 1h e re-dispara.
- Self-hosted em VPS com restart automático (systemd/Docker).
- Workflows de enriquecimento e análise em instâncias separadas (isolamento de falha).

---

### R13 — Qualidade do Enriquecimento via Scraping
**Probabilidade:** Média | **Impacto:** Baixo

O Nível 1 (scraping puro) depende de o website da empresa estar disponível e ter dados de contato acessíveis no HTML. Empresas com:
- Sites que carregam contato via JavaScript dinâmico (SPAs)
- Formulários de contato sem email visível
- Sites offline ou com proteção anti-bot

podem não ser enriquecidas no Nível 1, passando para o Nível 2 (Gemini) ou permanecendo sem dados.

**Mitigação:**
- Nível 2 (Gemini) como fallback cobre a maioria dos casos de SPA.
- Dashboard admin mostra taxa de enriquecimento por lote — permite detectar fontes de baixa qualidade.
- Manter expectativa realista: meta é enriquecer 70-80% dos leads, não 100%.

---

### R14 — Leads `invalid` Publicados na Base Atual
**Probabilidade:** Confirmado | **Impacto:** Baixo (base pequena)

A análise DT-CALLS-02 identificou **5 registros em `global_leads` com `status = active` mas sem email e sem telefone** — classificados como `invalid` sob a nova política.

**Mitigação:**
- Executar tarefa de limpeza antes do lançamento do módulo de Calls: `UPDATE global_leads SET status = 'invalid' WHERE email IS NULL AND phone IS NULL`.
- Verificar se algum desses 5 registros está em `user_leads` antes de marcar como inválido.

---

## 5. Oportunidades Identificadas

### O1 — Base de Telefones Melhor que o Esperado
A análise DT-CALLS-02 revelou que 98,2% dos leads já têm telefone válido com DDI +55. O módulo de Calls pode ser lançado sem nenhuma normalização prévia de dados.

> ~~Relatório de qualidade dos números existentes antes da Fase 3~~ — já executado em DT-CALLS-02. Concluído.

### O2 — Análise de Ligação como Diferencial Competitivo
Nenhum CRM brasileiro B2B para PMEs oferece análise de IA pós-chamada integrada. Este é o principal diferencial da V2 e deve ser o destaque no marketing.

### O3 — Análise em Tempo Real (Roadmap Futuro)
Com Twilio Media Streams + Gemini streaming, é possível exibir sugestões ao vendedor *durante* a ligação ("O lead mencionou concorrente X — considere abordar Y"). Alta complexidade, mas alto valor percebido.

### O4 — Transcrição como Registro Legal
Empresas que vendem para grandes contas precisam de registro formal de negociações. A transcrição permanente pode ser posicionada como "ata automática de reunião telefônica".

### O5 — Integração Futura com WhatsApp Business API
A arquitetura de `calls` com tipo de canal abstrato (`direction`, `status`, `notes`) facilita reutilizar o padrão para WhatsApp. A tabela `calls` pode ser renomeada para `interactions` no futuro com campo `channel: 'call' | 'whatsapp' | 'meeting'`.

> Não implementar agora, mas manter essa visão ao nomear colunas e componentes.
