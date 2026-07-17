// Camada de negócio do módulo de ligações.
// As rotas delegam aqui — nunca interagem com o provider diretamente.
// Conhece: repositórios, ITelephonyProvider (via factory), regras de negócio.
// Não conhece: HTTP, TwiML, SDK Twilio.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { ITelephonyProvider, AccessTokenResult } from '@/lib/telephony/ITelephonyProvider'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { createProviderFromSettings } from '@/lib/telephony/factory'
import { createCall, updateCallStatus } from '@/repositories/callRepository'
import { createCallAnalysis, getCallAnalysisByCallId, deleteCallAnalysisByCallId } from '@/repositories/callAnalysisRepository'
import { debitWallet, getBalance } from '@/repositories/walletRepository'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { normalizeToE164 } from '@/lib/phone/normalizeToE164'
import { CALL_EVENT, dispatchCallEvent } from '@/features/calls/events'

// ── tipos de retorno ──────────────────────────────────────────────────────────

export type TokenResult =
  | { ok: true; data: AccessTokenResult }
  | { ok: false; error: string; status: 400 | 401 | 422 | 500 }

export type TwiMLResult =
  | { ok: true; twiml: string }
  | { ok: false; error: string; forbidden?: boolean }

export type StatusCallbackResult =
  | { ok: true }
  | { ok: false; forbidden?: boolean }

export type RequestAnalysisResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string; status: 402 | 404 | 422 | 500; custo?: number; balance?: number }

// ── helpers ───────────────────────────────────────────────────────────────────

async function loadProvider(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ provider: ITelephonyProvider; phoneNumber: string } | null> {
  // Telnyx: número dedicado por usuário (ANATEL bloqueia CallerID compartilhado
  // — ver docs/tasks-v1.md, decisão 2026-07-14). Usuário precisa ter reivindicado
  // um número em Configurações → Telefonia antes de conseguir ligar.
  if (process.env.TELEPHONY_PROVIDER === 'telnyx') {
    const { data: numberRow } = await supabase
      .from('telnyx_numbers')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('status', 'assigned')
      .maybeSingle()

    if (!numberRow?.phone_number) return null

    const { TelnyxProvider } = await import('@/lib/telephony/telnyxProvider')
    return { provider: new TelnyxProvider(numberRow.phone_number), phoneNumber: numberRow.phone_number }
  }

  // Twilio é per-user: configurações no banco por usuário
  const settings = await getTelephonySettings(supabase, userId)
  if (!settings || !settings.is_active) return null
  const provider = createProviderFromSettings(settings)
  return { provider, phoneNumber: settings.phone_number }
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

// ── operações públicas ────────────────────────────────────────────────────────

/**
 * Gera token para o SDK browser inicializar (chamado por POST /api/calls/token).
 */
export async function generateToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TokenResult> {
  let loaded: Awaited<ReturnType<typeof loadProvider>>
  try {
    loaded = await loadProvider(supabase, userId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao carregar configurações de telefonia.'
    console.error('[callService.generateToken] loadProvider error', err)
    return { ok: false, error: msg, status: 500 }
  }

  if (!loaded) {
    return { ok: false, error: 'Telefonia não configurada. Acesse Configurações → Telefonia.', status: 422 }
  }

  try {
    const data = await loaded.provider.generateAccessToken(userId)
    return { ok: true, data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[callService.generateToken] erro:', msg)
    return { ok: false, error: `Falha ao gerar token de telefonia: ${msg}`, status: 500 }
  }
}

/**
 * Valida a assinatura do webhook e gera o TwiML para a chamada
 * (chamado por POST /api/calls/twiml).
 *
 * Mesma Application Telnyx atende tanto chamadas de saída (iniciadas pelo SDK
 * do navegador, com SIP headers) quanto chamadas de entrada (lead ligando de
 * volta pro número dedicado de algum usuário, sem SIP headers) — números do
 * pool vivem todos nela. Sem identidade de chamador nos params = é entrada.
 *
 * adminSupabase: cliente com service role (sem RLS) para criar o registro da call.
 */
export async function handleOutboundCallWebhook(
  adminSupabase: SupabaseClient<Database>,
  rawParams: Record<string, string>,
  webhookUrl: string,
  rawHeaders: Record<string, string>,
  rawBody: string
): Promise<TwiMLResult> {
  // Precisamos do provider para validar a assinatura — mas ainda não sabemos o userId.
  // O userId vem dentro dos params após o parse. Para validar antes do parse:
  // Primeiro parseamos (sem validar), extraímos o userId, carregamos o provider, validamos.
  const parsed = parseOutboundCallParamsUnsafe(rawParams)

  if (!parsed.userId) {
    return handleInboundCallWebhook(adminSupabase, rawParams, webhookUrl, rawHeaders, rawBody)
  }

  const loaded = await loadProvider(adminSupabase, parsed.userId)
  if (!loaded) {
    return { ok: false, error: 'Telefonia não configurada.' }
  }

  const { provider } = loaded

  if (!isDev() && !provider.validateWebhookSignature(rawHeaders, webhookUrl, rawBody, rawParams)) {
    return { ok: false, error: 'Assinatura inválida.', forbidden: true }
  }

  const request = provider.parseOutboundCallRequest(rawParams)
  if (!request.callSid || !request.toNumber) {
    return { ok: false, error: 'Parâmetros de chamada incompletos.' }
  }

  const call = await createCall(adminSupabase, {
    id:           request.clientCallId ?? undefined,
    user_id:      request.userId!,
    lead_id:      request.leadId,
    user_lead_id: request.userLeadId,
    call_sid:     request.callSid,
    to_number:    request.toNumber,
    from_number:  loaded.phoneNumber,
  })

  if (call) {
    dispatchCallEvent({
      type: CALL_EVENT.CALL_STARTED,
      callId: call.id,
      userId: request.userId!,
      occurredAt: new Date().toISOString(),
    })
  }

  const twiml = provider.generateCallInstruction(
    request.toNumber,
    call?.id ?? request.callSid,
    true
  )

  return { ok: true, twiml }
}

/**
 * Gera o TeXML que encaminha uma chamada de entrada (lead ligando de volta pro
 * número dedicado do usuário) pro celular pessoal do usuário.
 * Chamado internamente por handleOutboundCallWebhook quando o webhook não traz
 * identidade de chamador (sinal de que não foi o app que iniciou a chamada).
 *
 * Diferente do outbound: não há SIP header com userId — o usuário é resolvido
 * pelo número discado (To) via telnyx_numbers. Sem gravação, sem cobrança
 * (ver bloco de débito em handleStatusCallbackWebhook, que ignora direction='inbound').
 */
async function handleInboundCallWebhook(
  adminSupabase: SupabaseClient<Database>,
  rawParams: Record<string, string>,
  webhookUrl: string,
  rawHeaders: Record<string, string>,
  rawBody: string
): Promise<TwiMLResult> {
  if (process.env.TELEPHONY_PROVIDER !== 'telnyx') {
    return { ok: false, error: 'Encaminhamento de chamadas de entrada só suportado com Telnyx.' }
  }

  const { TelnyxProvider } = await import('@/lib/telephony/telnyxProvider')
  const provider = new TelnyxProvider()

  if (!isDev() && !provider.validateWebhookSignature(rawHeaders, webhookUrl, rawBody, rawParams)) {
    return { ok: false, error: 'Assinatura inválida.', forbidden: true }
  }

  const { callSid, toNumber, fromNumber } = provider.parseInboundCallRequest(rawParams)
  if (!toNumber) {
    return { ok: false, error: 'Número de destino ausente.' }
  }

  const { data: numberRow } = await adminSupabase
    .from('telnyx_numbers')
    .select('user_id')
    .eq('phone_number', toNumber)
    .eq('status', 'assigned')
    .maybeSingle()

  if (!numberRow?.user_id) {
    return {
      ok: true,
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Número temporariamente indisponível.</Say><Hangup/></Response>`,
    }
  }

  const userId = numberRow.user_id

  const { data: profile } = await adminSupabase
    .from('company_profiles')
    .select('forwarding_cell_phone')
    .eq('user_id', userId)
    .maybeSingle()

  const forwardTo = profile?.forwarding_cell_phone
  if (!forwardTo) {
    return {
      ok: true,
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">O responsável por este número ainda não configurou o encaminhamento de chamadas.</Say><Hangup/></Response>`,
    }
  }

  const match = await matchInboundCallerToLead(adminSupabase, userId, fromNumber)

  await createCall(adminSupabase, {
    user_id:      userId,
    lead_id:      match.leadId,
    user_lead_id: match.userLeadId,
    call_sid:     callSid,
    to_number:    toNumber,
    from_number:  fromNumber,
    direction:    'inbound',
  })

  // Dispara e segue — não bloqueia a resposta TeXML esperando o envio do email
  notifyMissedCallAttempt(adminSupabase, userId, fromNumber, match).catch((err) =>
    console.error('[callService] falha ao notificar chamada de entrada:', err)
  )

  const twiml = provider.generateInboundForwardInstruction(forwardTo)
  return { ok: true, twiml }
}

/**
 * Atualiza status da chamada a partir do webhook do provedor
 * (chamado por POST /api/calls/status).
 */
export async function handleStatusCallbackWebhook(
  adminSupabase: SupabaseClient<Database>,
  rawParams: Record<string, string>,
  webhookUrl: string,
  rawHeaders: Record<string, string>,
  rawBody: string
): Promise<StatusCallbackResult> {
  let userId = extractUserIdUnsafe(rawParams)

  // Telnyx status/recording callbacks não incluem SipHeader_* — busca userId pelo CallSid
  if (!userId && rawParams['CallSid']) {
    const { data: callRow } = await adminSupabase
      .from('calls')
      .select('user_id')
      .eq('call_sid', rawParams['CallSid'])
      .maybeSingle()
    userId = callRow?.user_id ?? null
  }

  // Callback de gravação sem userId identificado
  if (!userId) {
    if (rawParams['RecordingStatus'] === 'completed' && rawParams['CallSid'] && rawParams['RecordingSid']) {
      await handleRecordingCallback(adminSupabase, rawParams['CallSid'], rawParams['RecordingSid'])
    }
    return { ok: true }
  }

  const loaded = await loadProvider(adminSupabase, userId)
  if (!loaded) return { ok: true }

  const { provider } = loaded

  if (!isDev() && !provider.validateWebhookSignature(rawHeaders, webhookUrl, rawBody, rawParams)) {
    return { ok: false, forbidden: true }
  }

  const update = provider.parseStatusCallback(rawParams)
  if (!update.callSid) return { ok: true }

  const patch: Parameters<typeof updateCallStatus>[2] = { status: update.status }
  if (update.durationSeconds !== null) patch.duration_seconds = update.durationSeconds
  if (update.isTerminal) patch.ended_at = new Date().toISOString()
  if (update.recordingSid) patch.recording_sid = update.recordingSid
  if (update.recordingCompleted) {
    // recording_url fica NULL até o cron (Fase 4) transferir para o Storage
    // recording_expires_at = ended_at + 15 dias (CALLS_ROADMAP.md Phase 4.2)
    const base = patch.ended_at ?? new Date().toISOString()
    patch.recording_expires_at = new Date(
      new Date(base).getTime() + 15 * 24 * 60 * 60 * 1000
    ).toISOString()
  }

  await updateCallStatus(adminSupabase, update.callSid, patch)

  if (update.isTerminal && userId) {
    // Busca o callId pelo call_sid para disparar o evento e para o débito
    const { data: call } = await adminSupabase
      .from('calls')
      .select('id, direction')
      .eq('call_sid', update.callSid)
      .maybeSingle()

    if (call) {
      dispatchCallEvent({
        type: CALL_EVENT.CALL_ENDED,
        callId: call.id,
        userId,
        occurredAt: new Date().toISOString(),
        payload: { status: update.status, durationSeconds: update.durationSeconds },
      })

      // Débito de ligação — apenas para chamadas de saída completadas com duração real.
      // Chamadas de entrada (lead ligando de volta, encaminhada pro celular do
      // usuário) não são cobradas — custo absorvido pela Prospecta.
      const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      const isAdmin  = adminIds.includes(userId)
      const isInbound = call.direction === 'inbound'

      if (!isAdmin && !isInbound && update.status === 'completed' && update.durationSeconds && update.durationSeconds > 0) {
        const minutos = Math.ceil(update.durationSeconds / 60)
        const custo   = parseFloat((minutos * 0.20).toFixed(4))
        try {
          await debitWallet(
            adminSupabase,
            userId,
            custo,
            'call',
            call.id,
            `Ligação ${minutos} min`
          )
        } catch (err) {
          // Não retornar erro para a Twilio — callback já aconteceu
          console.error('[callService] débito de ligação falhou:', err)
        }
      }
    }
  }

  if (update.recordingCompleted && userId) {
    const { data: call } = await adminSupabase
      .from('calls')
      .select('id')
      .eq('call_sid', update.callSid)
      .maybeSingle()

    if (call) {
      dispatchCallEvent({
        type: CALL_EVENT.RECORDING_AVAILABLE,
        callId: call.id,
        userId,
        occurredAt: new Date().toISOString(),
        payload: { recordingSid: update.recordingSid, recordingUrl: update.recordingUrl },
      })

      if (update.recordingSid) {
        const { transferSingleRecording } = await import('@/services/callRecordingService')
        // await garante que o download/upload completa antes da Vercel encerrar o processo
        try {
          await transferSingleRecording(adminSupabase, {
            id: call.id,
            user_id: userId,
            recording_sid: update.recordingSid,
            recording_url: update.recordingUrl,
          })
        } catch (err) {
          console.error('[callService] immediate recording transfer failed', err)
          // não-fatal: o cron fará retry
        }
      }
    }
  }

  return { ok: true }
}

/**
 * Solicita análise de IA para uma chamada concluída (chamado por POST /api/calls/[id]/request-analysis).
 * Gatilhado explicitamente pelo usuário — nunca chamado automaticamente.
 * Fluxo: verifica créditos → debita → cria registro em call_analyses → dispara n8n.
 */
export async function requestCallAnalysis(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string
): Promise<RequestAnalysisResult> {
  const { getCallById } = await import('@/repositories/callRepository')
  const call = await getCallById(supabase, callId, userId)
  if (!call) return { ok: false, error: 'Chamada não encontrada.', status: 404 }

  // Se não há gravação, verifica o status antes de dar uma mensagem precisa
  if (!call.recording_url) {
    if (call.status !== 'completed') {
      return { ok: false, error: 'Chamada não concluída.', status: 422 }
    }
    return { ok: false, error: 'Gravação ainda não disponível. Aguarde e tente novamente.', status: 422 }
  }

  // Evita análise duplicada consultando call_analyses (tem UNIQUE constraint em call_id)
  const existingAnalysis = await getCallAnalysisByCallId(supabase, callId, userId)
  if (existingAnalysis) {
    return { ok: false, error: 'Análise já solicitada ou concluída para esta chamada.', status: 422 }
  }

  // Admin users (ADMIN_USER_IDS env var) são isentos de cobrança
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const isAdmin  = adminIds.includes(userId)

  const duracao  = call.duration_seconds ?? 0
  const minutos  = Math.ceil(duracao / 60) || 1
  const custo    = parseFloat((minutos * 0.08).toFixed(4))

  if (!isAdmin) {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    const balance = await getBalance(supabase, userId)
    if (balance < custo) {
      return { ok: false, error: 'Saldo insuficiente para analisar esta ligação.', status: 402, custo, balance }
    }

    try {
      await debitWallet(adminSupabase, userId, custo, 'analysis', callId, `Análise ${minutos} min`)
    } catch {
      const balanceAtual = await getBalance(supabase, userId)
      return { ok: false, error: 'Saldo insuficiente para analisar esta ligação.', status: 402, custo, balance: balanceAtual }
    }
  }

  const analysis = await createCallAnalysis(supabase, callId, userId, isAdmin ? 0 : custo)
  if (!analysis) return { ok: false, error: 'Falha ao registrar análise.', status: 500 }

  dispatchCallEvent({
    type: CALL_EVENT.ANALYSIS_STARTED,
    callId,
    userId,
    occurredAt: new Date().toISOString(),
    payload: { analysisId: analysis.id },
  })

  // Gera URL assinada (24h) para o n8n baixar a gravação do Storage privado
  const n8nUrl = process.env.N8N_CALL_ANALYSIS_WEBHOOK_URL
  if (n8nUrl) {
    const { data: signed } = await supabase.storage
      .from('call-recordings')
      .createSignedUrl(call.recording_url, 86400)

    await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id:       callId,
        analysis_id:   analysis.id,
        recording_url: signed?.signedUrl ?? null,
        user_id:       userId,
      }),
    }).catch((err) => console.error('[callService] n8n webhook error:', err))
  }

  return { ok: true, analysisId: analysis.id }
}

/**
 * Exclui a análise existente e solicita nova (reanálise).
 * Só permitido quando a análise anterior está completed ou failed.
 */
export async function reanalyzeCall(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string
): Promise<RequestAnalysisResult> {
  const { getCallById } = await import('@/repositories/callRepository')
  const call = await getCallById(supabase, callId, userId)
  if (!call) return { ok: false, error: 'Chamada não encontrada.', status: 404 }

  if (!call.recording_url) {
    return { ok: false, error: 'Gravação ainda não disponível.', status: 422 }
  }

  const existing = await getCallAnalysisByCallId(supabase, callId, userId)
  if (existing && existing.status !== 'completed' && existing.status !== 'failed') {
    return { ok: false, error: 'Análise em andamento. Aguarde antes de reanalisar.', status: 422 }
  }

  if (existing) {
    await deleteCallAnalysisByCallId(supabase, callId, userId)
  }

  // Reutiliza o fluxo normal (já sem análise existente)
  return requestCallAnalysis(supabase, callId, userId)
}

// ── handler interno para callback de gravação ─────────────────────────────────

async function handleRecordingCallback(
  adminSupabase: SupabaseClient<Database>,
  callSid: string,
  recordingSid: string
): Promise<void> {
  const { data: call } = await adminSupabase
    .from('calls')
    .select('id, user_id, recording_sid, status')
    .eq('call_sid', callSid)
    .maybeSingle()

  if (!call) {
    console.warn('[callService.handleRecordingCallback] call not found for callSid', callSid)
    return
  }

  // Atualiza recording_sid e marca chamada como completed (se ainda não estiver)
  await adminSupabase.from('calls').update({
    recording_sid: recordingSid,
    ...(call.status !== 'completed' ? { status: 'completed', ended_at: new Date().toISOString() } : {}),
  }).eq('id', call.id)

  // Transfere imediatamente para o Storage
  const { transferSingleRecording } = await import('@/services/callRecordingService')
  try {
    await transferSingleRecording(adminSupabase, {
      id: call.id,
      user_id: call.user_id,
      recording_sid: recordingSid,
    })
  } catch (err) {
    console.error('[callService] recording transfer failed', err)
  }

  dispatchCallEvent({
    type: CALL_EVENT.RECORDING_AVAILABLE,
    callId: call.id,
    userId: call.user_id,
    occurredAt: new Date().toISOString(),
    payload: { recordingSid, recordingUrl: null },
  })
}

// ── helpers internos (não exportados) ────────────────────────────────────────

type InboundLeadMatch = {
  leadId: string | null
  userLeadId: string | null
  leadName: string | null
}

/**
 * Casa o número de quem ligou (From) contra os leads/user_leads do usuário
 * resolvido pelo número discado. Escopado por user_id — volume por usuário
 * é pequeno o suficiente pra não precisar de coluna normalizada indexada.
 */
async function matchInboundCallerToLead(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  fromNumber: string
): Promise<InboundLeadMatch> {
  const noMatch: InboundLeadMatch = { leadId: null, userLeadId: null, leadName: null }
  if (!fromNumber) return noMatch

  const [leads, userLeads] = await Promise.all([
    getLeadsByUserId(adminSupabase, userId),
    getUserLeadsWithGlobalData(adminSupabase, userId),
  ])

  const lead = leads.find((l) => l.phone && normalizeToE164(l.phone, 'BR') === fromNumber)
  if (lead) return { leadId: lead.id, userLeadId: null, leadName: lead.company_name ?? null }

  const userLead = userLeads.find((l) => l.phone && normalizeToE164(l.phone, 'BR') === fromNumber)
  if (userLead) return { leadId: null, userLeadId: userLead.id, leadName: userLead.company_name }

  return noMatch
}

/**
 * Avisa por email que um lead (ou número desconhecido) tentou contato ligando
 * de volta. Dispara e esquece — falha de notificação não deve afetar a chamada.
 */
async function notifyMissedCallAttempt(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  fromNumber: string,
  match: InboundLeadMatch
): Promise<void> {
  const { data: { user } } = await adminSupabase.auth.admin.getUserById(userId)
  if (!user?.email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const leadUrl = match.leadId
    ? `${appUrl}/leads/${match.leadId}`
    : match.userLeadId
      ? `${appUrl}/leads/global/${match.userLeadId}`
      : null

  const { sendMissedCallNotification } = await import('@/services/callNotificationService')
  await sendMissedCallNotification(user.email, {
    callerPhone: fromNumber,
    leadName: match.leadName,
    leadUrl,
  })
}

function extractUserIdUnsafe(params: Record<string, string>): string | null {
  // Telnyx: userId passado como SIP custom header pelo browser SDK
  if (params['SipHeader_X-ProspectaUserId']) return params['SipHeader_X-ProspectaUserId']

  // Twilio: codificado em Caller como "client:user_<uuid sem hifens>"
  const caller = params['Caller'] ?? ''
  const raw = caller.replace(/^client:/, '').replace(/^user_/, '')
  if (raw.length !== 32) return null
  return [raw.slice(0,8), raw.slice(8,12), raw.slice(12,16), raw.slice(16,20), raw.slice(20)].join('-')
}

function parseOutboundCallParamsUnsafe(params: Record<string, string>) {
  return {
    callSid:    params['CallSid'] ?? '',
    userId:     extractUserIdUnsafe(params),
    toNumber:   params['To'] ?? '',
    // Suporta Telnyx (SipHeader_*) e Twilio (callLeadId/callUserLeadId)
    leadId:     params['SipHeader_X-ProspectaLeadId']     || params['callLeadId']     || null,
    userLeadId: params['SipHeader_X-ProspectaUserLeadId'] || params['callUserLeadId'] || null,
  }
}
