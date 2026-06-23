# DT-CALLS-01 — Estudo Técnico: Telefonia no Prospecta

**Status:** Concluído  
**Data:** 2026-06-21  
**Decisão:** Opção A (WebRTC Softphone via Twilio Voice SDK)

---

## Objetivo

Investigar as opções técnicas para implementação do canal de ligações no Prospecta, comparando Softphone WebRTC (Opção A) com Click-to-Call (Opção B), e gerar recomendação fundamentada antes de qualquer implementação.

---

## Opção A — Softphone WebRTC (Browser)

### Fluxo

```
Usuário clica "Ligar" no Prospecta
    → Twilio Voice JavaScript SDK inicializa no browser
    → Browser cria conexão WebRTC com Twilio Edge
    → Twilio conecta com o número do lead via PSTN
    → Áudio bidirecional pelo browser
    → Gravação opcional via Twilio Recording
    → Ao encerrar: callback HTTP → n8n → IA
```

### Compatibilidade de Navegadores

| Navegador | Versão Mínima | Suporte WebRTC | Observações |
|---|---|---|---|
| Chrome | 23+ | ✅ Nativo | Melhor experiência, sem restrições |
| Edge | 79+ (Chromium) | ✅ Nativo | Idêntico ao Chrome |
| Firefox | 22+ | ✅ Nativo | Funciona, menos testado com Twilio SDK |
| Safari | 11+ (desktop), 14.5+ (iOS) | ✅ Com ressalvas | Requer interação do usuário para `getUserMedia`; iOS requer HTTPS obrigatório |
| Opera | 15+ | ✅ | Baseado no Chromium |

**Ressalvas para Safari/iOS:**
- `getUserMedia` (acesso ao microfone) requer gesto explícito do usuário — não pode ser chamado programaticamente sem clique
- Em iOS Safari, WebRTC funciona mas o SDK Twilio pode apresentar latência maior
- Necessário HTTPS em todos os ambientes (Vercel já garante isso)
- Recomendado testar microfone antes de iniciar ligação (botão "Testar áudio")

### Gravação

- **Mecanismo:** TwiML `<Record>` noun ou `Conference` com `record="record-from-start"`
- **Armazenamento:** Twilio armazena por padrão 365 dias; para nossa regra de 15 dias, buscamos a URL e transferimos para Supabase Storage via cron
- **Formato:** WAV (8kHz mono) ou MP3 (configurável) — MP3 recomendado para menor tamanho
- **Custo de armazenamento Twilio:** $0.0025/min enquanto mantido no Twilio
- **Acesso:** URL autenticada Twilio com credenciais, ou URL pública temporária

### Integração n8n

- **Mecanismo:** Twilio Status Callbacks — configurável no TwiML App para enviar POST a uma URL ao término da chamada
- **Dados recebidos pelo n8n:** `CallSid`, `CallStatus`, `CallDuration`, `RecordingSid`, `RecordingUrl`, `RecordingDuration`
- **Fluxo n8n:**
  1. Recebe callback Twilio
  2. Valida assinatura Twilio (X-Twilio-Signature)
  3. Faz download do áudio
  4. Envia para Gemini (transcription + analysis)
  5. POST para `/api/calls/[id]/analysis` com resultado
- **Alternativa sem n8n:** Processar diretamente na API route (mais simples, menos flexível)

> **Atualização DT-CALLS-03:** o n8n passará a ter dois workflows: `call-analysis-pipeline` (análise de chamadas) e `lead-enrichment-pipeline` (enriquecimento de leads por scraping + IA). A mesma instância serve ambos — workflows separados, sem interferência.

### Captura de Áudio para IA

**Via Gravação Twilio (recomendado):**
- Twilio grava e disponibiliza URL do arquivo
- n8n faz download e envia para Gemini multimodal ou Whisper para transcrição
- Vantagem: sem custo adicional de streaming, processamento assíncrono

**Via Streaming em Tempo Real (futuro):**
- Twilio Media Streams via WebSocket
- Permite análise em tempo real (sugestões ao vivo para o vendedor)
- Complexidade significativamente maior
- Não recomendado para V2

### Custo Adicional (Twilio)

| Item | Custo |
|---|---|
| Número de telefone EUA | ~$1.15/mês |
| Número de telefone Brasil | ~$2.00/mês |
| Ligação sainte para celular BR | ~$0.056/min |
| Ligação sainte para fixo BR | ~$0.027/min |
| Armazenamento de gravação | $0.0025/min |
| Voice SDK (WebRTC) | Sem custo adicional por SDK |

> Exemplo: usuário com 50 ligações/mês, média 5 min = 250 min → ~$14 em tarifas Twilio (celular BR). O usuário paga a sua própria conta Twilio — o Prospecta não arca com esse custo.

### Limitações para o Brasil

- Twilio tem edge location em São Paulo — latência aceitável (~40-60ms)
- Números brasileiros disponíveis no Twilio (+55)
- Regulatório: chamadas B2B em horário comercial geralmente não exigem aviso de gravação explícito na lei brasileira, mas boa prática é informar (ver CALLS_RISKS.md)
- Celulares móveis brasileiros têm tarifa mais alta que fixos
- Twilio pode bloquear destinos de alto risco (não se aplica ao Brasil)

---

## Opção B — Click-to-Call

### Fluxo

```
Usuário clica "Ligar" no Prospecta
    → Prospecta chama API Twilio para iniciar chamada
    → Twilio liga para o NÚMERO DO VENDEDOR (celular/fixo pessoal)
    → Vendedor atende seu próprio telefone
    → Twilio conecta com o número do lead
    → Conversa acontece pelo telefone físico do vendedor
```

### Comparativo com Opção A

| Critério | Opção A (WebRTC) | Opção B (Click-to-Call) |
|---|---|---|
| **UX** | ✅ Dentro do browser, sem telefone | ❌ Exige telefone físico disponível |
| **Complexidade de implementação** | Média (SDK frontend + backend) | Baixa (só backend) |
| **Custo por ligação** | 1x tarifa (Twilio → Lead) | 2x tarifa (Twilio → Vendedor + Twilio → Lead) |
| **Gravação** | ✅ Fácil via TwiML | ✅ Possível mas requer conferência |
| **Estabilidade** | Media (depende do browser/microfone) | ✅ Alta (PSTN convencional) |
| **Tempo de implementação** | ~3 semanas | ~1 semana |
| **Integração com IA** | ✅ Mesma via gravação | ✅ Mesma via gravação |
| **Latência** | 40-80ms (WebRTC) | Baixa (PSTN) |
| **Mobilidade** | Browser qualquer dispositivo | Requer telefone separado |
| **Credenciais necessárias** | Twilio SID + Token + Number + TwiML App SID | Twilio SID + Token + Number + número pessoal vendedor |

---

## Recomendação Final

**Implementar Opção A (WebRTC Softphone) como padrão, com Opção B como fallback opcional nas configurações.**

### Justificativa

1. **UX superior:** O diferencial do Prospecta é ser uma plataforma integrada. Click-to-Call quebra o fluxo — o vendedor precisa largar o computador e pegar o celular.
2. **Custo menor por chamada:** Com WebRTC, o usuário paga apenas 1 trecho Twilio (→ lead). Com Click-to-Call, paga 2 trechos.
3. **Gravação mais simples:** No WebRTC, a gravação é configurada uma vez no TwiML App.
4. **Timeline contínua:** Com browser in-app, o timer e as notas são capturados naturalmente na mesma tela.
5. **Preparação para futuro:** WebRTC permite evoluir para análise em tempo real (Media Streams), sugestões ao vivo, etc.

### Risco Mitigado

O principal risco da Opção A (dependência de microfone no browser) é mitigado por:
- Indicador visual de status do microfone antes de iniciar
- Fallback: campo "Você prefere receber a chamada?" → ativa Opção B pontualmente

---

## Dependências a Instalar

```bash
# Twilio Voice JS SDK (browser)
npm install @twilio/voice-sdk

# Para parsing/validação de números de telefone (E.164)
npm install libphonenumber-js

# Para criptografia das credenciais Twilio (Auth Token)
# Usar Web Crypto API nativa do Node.js (sem dependência extra)
```

---

## Próximos Passos

Ver `CALLS_ROADMAP.md` para sequência de implementação.
