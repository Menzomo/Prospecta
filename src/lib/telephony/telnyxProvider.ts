// ÚNICO arquivo no projeto que importa o SDK Telnyx (server).
// Nenhum outro módulo deve importar de 'telnyx' diretamente.

import Telnyx from 'telnyx'
import { createPublicKey, verify as cryptoVerify } from 'crypto'
import { parsePhoneNumber } from 'libphonenumber-js'
import type {
  ITelephonyProvider,
  AccessTokenResult,
  OutboundCallRequest,
  CallStatusUpdate,
} from './ITelephonyProvider'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'no-answer', 'busy', 'canceled'])

const STATUS_MAP: Record<string, string> = {
  initiated:     'initiated',
  ringing:       'ringing',
  'in-progress': 'in-progress',
  completed:     'completed',
  failed:        'failed',
  'no-answer':   'no-answer',
  busy:          'busy',
  canceled:      'canceled',
}

export class TelnyxProvider implements ITelephonyProvider {
  readonly name = 'telnyx'

  /**
   * Cria uma credencial temporária no Telnyx e gera o JWT para o browser SDK.
   * Cada sessão de chamada cria e expira sua própria credencial (1h de vida).
   */
  async generateAccessToken(userId: string): Promise<AccessTokenResult> {
    const apiKey = process.env.TELNYX_API_KEY
    const appId  = process.env.TELNYX_APP_ID
    const phoneNumber = process.env.TELNYX_PHONE_NUMBER ?? ''

    if (!apiKey || !appId) {
      throw new Error('Telnyx: TELNYX_API_KEY e TELNYX_APP_ID são obrigatórios')
    }

    const client = new Telnyx({ apiKey })

    // Credencial expira em 1 hora junto com o token
    const expires_at = new Date(Date.now() + 3_600_000).toISOString()

    const credResp = await client.telephonyCredentials.create({
      connection_id: appId,
      name: `prospecta:${userId}`,
      expires_at,
    })

    const credId = credResp.data?.id
    if (!credId) throw new Error('Telnyx: falha ao criar credencial de telefonia')

    const tokenRaw = await client.telephonyCredentials.createToken(credId)
    // O SDK pode retornar a string diretamente ou envolta em { data: string }
    const token: string = typeof tokenRaw === 'string'
      ? tokenRaw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (tokenRaw as any)?.data ?? (tokenRaw as any)?.token ?? String(tokenRaw)

    console.log('[TelnyxProvider] token gerado, tipo:', typeof tokenRaw, 'credId:', credId)

    return { token, identity: userId, phoneNumber, provider: 'telnyx' }
  }

  /**
   * Gera TeXML (equivalente Telnyx ao TwiML do Twilio).
   * O browser envia userId via SIP custom headers — não precisa estar no TeXML.
   */
  generateCallInstruction(to: string, callId: string, record: boolean): string {
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const phoneNumber = process.env.TELNYX_PHONE_NUMBER ?? ''
    const toE164      = this.normalizeToE164(to)

    const recordPart = record
      ? `record="record-from-answer" recordingStatusCallback="${appUrl}/api/calls/status" recordingStatusCallbackMethod="POST"`
      : `record="do-not-record"`

    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response>` +
      `<Dial callerId="${phoneNumber}" ${recordPart}` +
      ` action="${appUrl}/api/calls/twiml/completed?callId=${callId}" method="POST">` +
      `<Number>${toE164}</Number>` +
      `</Dial>` +
      `</Response>`
    )
  }

  /**
   * Valida assinatura Ed25519 do Telnyx.
   * Mensagem = `${timestamp}|${rawBody}`, chave pública em TELNYX_PUBLIC_KEY (base64 raw).
   */
  validateWebhookSignature(
    headers: Record<string, string>,
    _url: string,
    rawBody: string,
    params: Record<string, string>
  ): boolean {
    const signature = headers['telnyx-signature-ed25519-signature']

    if (!signature) {
      const connectionId = params['ConnectionId']
      const expectedId   = process.env.TELNYX_APP_ID

      // TeXML parking webhooks: têm ConnectionId no payload
      if (connectionId) return !expectedId || connectionId === expectedId

      // Recording/status callbacks TeXML: sem ConnectionId e sem Ed25519
      // Telnyx não assina esses callbacks — validamos pelo conteúdo (CallSid verificado no DB)
      return true
    }

    // Webhooks Voice API — valida com Ed25519
    const publicKey = process.env.TELNYX_PUBLIC_KEY
    if (!publicKey) return false

    const timestamp = headers['telnyx-signature-ed25519-timestamp']
    if (!timestamp) return false

    const ts = parseInt(timestamp, 10)
    if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

    try {
      const pubKeyBytes = Buffer.from(publicKey, 'base64')
      const pubKey = createPublicKey({
        format: 'jwk',
        key: { kty: 'OKP', crv: 'Ed25519', x: pubKeyBytes.toString('base64url') },
      })
      const message  = Buffer.from(`${timestamp}|${rawBody}`)
      const sigBytes = Buffer.from(signature, 'base64')
      return cryptoVerify(null, message, pubKey, sigBytes)
    } catch {
      return false
    }
  }

  /**
   * Extrai parâmetros de início de chamada do webhook TeXML.
   * O browser passa userId, callId, leadId e userLeadId como SIP custom headers
   * (X-Prospecta*) que o Telnyx repassa como SipHeader_X-Prospecta* no webhook.
   */
  parseOutboundCallRequest(params: Record<string, string>): OutboundCallRequest {
    return {
      clientCallId: params['SipHeader_X-ProspectaCallId']     || null,
      callSid:      params['CallSid']                          ?? '',
      userId:       params['SipHeader_X-ProspectaUserId']     || null,
      toNumber:     this.normalizeToE164(params['To']         ?? ''),
      leadId:       params['SipHeader_X-ProspectaLeadId']     || null,
      userLeadId:   params['SipHeader_X-ProspectaUserLeadId'] || null,
    }
  }

  /**
   * Normaliza os parâmetros do webhook de status do Telnyx.
   * O Telnyx TeXML usa os mesmos nomes de campo que o Twilio TwiML.
   */
  parseStatusCallback(params: Record<string, string>): CallStatusUpdate {
    const rawStatus = params['CallStatus'] ?? ''
    const status    = STATUS_MAP[rawStatus] ?? rawStatus
    const duration  = params['CallDuration'] ? parseInt(params['CallDuration'], 10) : null

    const recordingCompleted = params['RecordingStatus'] === 'completed'

    return {
      callSid:           params['CallSid']       ?? '',
      userId:            params['SipHeader_X-ProspectaUserId'] || null,
      status,
      durationSeconds:   duration,
      recordingSid:      params['RecordingSid']  || null,
      recordingUrl:      params['RecordingUrl']  || null,
      recordingCompleted,
      isTerminal:        TERMINAL_STATUSES.has(status),
    }
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private normalizeToE164(phone: string): string {
    try {
      const parsed = parsePhoneNumber(phone)
      if (parsed.isValid()) return parsed.format('E.164')
    } catch { /* fallthrough */ }
    return phone.replace(/[\s\-\(\)]/g, '')
  }
}
