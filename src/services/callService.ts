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
import { createCallAnalysis } from '@/repositories/callAnalysisRepository'
import { deductCredit, getCurrentPeriodCredits } from '@/repositories/analysisCreditRepository'
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
  | { ok: false; error: string; status: 402 | 404 | 422 | 500 }

// ── helpers ───────────────────────────────────────────────────────────────────

async function loadProvider(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ provider: ITelephonyProvider; phoneNumber: string } | null> {
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
  const loaded = await loadProvider(supabase, userId)
  if (!loaded) {
    return { ok: false, error: 'Telefonia não configurada. Acesse Configurações → Telefonia.', status: 422 }
  }

  try {
    const data = loaded.provider.generateAccessToken(userId)
    return { ok: true, data }
  } catch (err) {
    console.error('[callService.generateToken]', err)
    return { ok: false, error: 'Falha ao gerar token de telefonia.', status: 500 }
  }
}

/**
 * Valida a assinatura do webhook e gera o TwiML para a chamada
 * (chamado por POST /api/calls/twiml).
 *
 * adminSupabase: cliente com service role (sem RLS) para criar o registro da call.
 */
export async function handleOutboundCallWebhook(
  adminSupabase: SupabaseClient<Database>,
  rawParams: Record<string, string>,
  webhookUrl: string,
  signature: string
): Promise<TwiMLResult> {
  // Precisamos do provider para validar a assinatura — mas ainda não sabemos o userId.
  // O userId vem dentro dos params após o parse. Para validar antes do parse:
  // Primeiro parseamos (sem validar), extraímos o userId, carregamos o provider, validamos.
  const parsed = parseOutboundCallParamsUnsafe(rawParams)

  if (!parsed.userId) {
    return { ok: false, error: 'Identidade de chamador ausente.' }
  }

  const loaded = await loadProvider(adminSupabase, parsed.userId)
  if (!loaded) {
    return { ok: false, error: 'Telefonia não configurada.' }
  }

  const { provider } = loaded

  if (!isDev() && !provider.validateWebhookSignature(signature, webhookUrl, rawParams)) {
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
 * Atualiza status da chamada a partir do webhook do provedor
 * (chamado por POST /api/calls/status).
 */
export async function handleStatusCallbackWebhook(
  adminSupabase: SupabaseClient<Database>,
  rawParams: Record<string, string>,
  webhookUrl: string,
  signature: string
): Promise<StatusCallbackResult> {
  const userId = extractUserIdUnsafe(rawParams)
  if (!userId) return { ok: true } // recording callback sem identidade — ignorar

  const loaded = await loadProvider(adminSupabase, userId)
  if (!loaded) return { ok: true }

  const { provider } = loaded

  if (!isDev() && !provider.validateWebhookSignature(signature, webhookUrl, rawParams)) {
    return { ok: false, forbidden: true }
  }

  const update = provider.parseStatusCallback(rawParams)
  if (!update.callSid) return { ok: true }

  const patch: Parameters<typeof updateCallStatus>[2] = { status: update.status }
  if (update.durationSeconds !== null) patch.duration_seconds = update.durationSeconds
  if (update.isTerminal) patch.ended_at = new Date().toISOString()
  if (update.recordingSid) patch.recording_sid = update.recordingSid
  if (update.recordingCompleted) {
    patch.recording_status = 'pending'  // aguarda cron de transferência (Fase 4)
    if (update.recordingUrl) patch.recording_url = update.recordingUrl
  }

  await updateCallStatus(adminSupabase, update.callSid, patch)

  if (update.isTerminal && userId) {
    // Busca o callId pelo call_sid para disparar o evento
    const { data: call } = await adminSupabase
      .from('calls')
      .select('id')
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
    }
  }

  return { ok: true }
}

/**
 * Solicita análise de IA para uma chamada concluída (chamado por POST /api/calls/[id]/request-analysis).
 */
export async function requestCallAnalysis(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string
): Promise<RequestAnalysisResult> {
  const { getCallById } = await import('@/repositories/callRepository')
  const call = await getCallById(supabase, callId, userId)
  if (!call) return { ok: false, error: 'Chamada não encontrada.', status: 404 }

  if (call.status !== 'completed') {
    return { ok: false, error: 'Chamada não concluída.', status: 422 }
  }
  if (!call.recording_url) {
    return { ok: false, error: 'Gravação ainda não disponível. Aguarde e tente novamente.', status: 422 }
  }

  const credits = await getCurrentPeriodCredits(supabase, userId)
  if (!credits || credits.credits_total - credits.credits_used <= 0) {
    return { ok: false, error: 'Créditos de análise esgotados.', status: 402 }
  }

  const deducted = await deductCredit(supabase, userId)
  if (!deducted) {
    return { ok: false, error: 'Créditos de análise esgotados.', status: 402 }
  }

  const analysis = await createCallAnalysis(supabase, callId, userId)
  if (!analysis) return { ok: false, error: 'Falha ao registrar análise.', status: 500 }

  // Marca analysis_status = 'pending' na chamada para o n8n detectar
  await supabase
    .from('calls')
    .update({ analysis_status: 'pending', analysis_requested_at: new Date().toISOString() })
    .eq('id', callId)

  dispatchCallEvent({
    type: CALL_EVENT.ANALYSIS_STARTED,
    callId,
    userId,
    occurredAt: new Date().toISOString(),
    payload: { analysisId: analysis.id },
  })

  const n8nUrl = process.env.N8N_CALL_ANALYSIS_WEBHOOK_URL
  if (n8nUrl) {
    fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id:       callId,
        analysis_id:   analysis.id,
        recording_url: call.recording_url,
        user_id:       userId,
      }),
    }).catch((err) => console.error('[callService] n8n webhook error:', err))
  }

  return { ok: true, analysisId: analysis.id }
}

// ── helpers internos (não exportados) ────────────────────────────────────────

function extractUserIdUnsafe(params: Record<string, string>): string | null {
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
    leadId:     params['callLeadId'] || null,
    userLeadId: params['callUserLeadId'] || null,
  }
}
