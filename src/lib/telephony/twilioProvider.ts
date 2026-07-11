// ÚNICO arquivo no projeto que importa o SDK Twilio.
// Nenhum outro módulo deve importar de 'twilio' diretamente.

import twilio from 'twilio'
import { parsePhoneNumber } from 'libphonenumber-js'
import type {
  ITelephonyProvider,
  AccessTokenResult,
  OutboundCallRequest,
  CallStatusUpdate,
} from './ITelephonyProvider'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'no-answer', 'busy', 'canceled'])

// Mapeamento de status Twilio para nossos valores normalizados
const STATUS_MAP: Record<string, string> = {
  initiated:    'initiated',
  ringing:      'ringing',
  'in-progress': 'in-progress',
  completed:    'completed',
  failed:       'failed',
  'no-answer':  'no-answer',
  busy:         'busy',
  canceled:     'canceled',
}

type Config = {
  accountSid: string
  authToken: string        // em plaintext — descriptografado pela factory
  apiKeySid?: string | null
  apiKeySecret?: string | null
  phoneNumber: string
  twimlAppSid?: string | null
  appUrl: string
}

export class TwilioProvider implements ITelephonyProvider {
  constructor(private readonly cfg: Config) {}

  async generateAccessToken(userId: string): Promise<AccessTokenResult> {
    const { AccessToken } = twilio.jwt
    const { VoiceGrant } = AccessToken

    // Prefere API Key (mais seguro); cai para Account SID/Auth Token como fallback
    const keySid    = this.cfg.apiKeySid    ?? this.cfg.accountSid
    const keySecret = this.cfg.apiKeySecret ?? this.cfg.authToken

    // Identidade: "user_<uuid sem hifens>" — recuperada nos callbacks via Caller
    const identity = `user_${userId.replace(/-/g, '')}`

    const grant = new VoiceGrant({
      outgoingApplicationSid: this.cfg.twimlAppSid ?? undefined,
      incomingAllow: false,
    })

    const token = new AccessToken(this.cfg.accountSid, keySid, keySecret, {
      identity,
      ttl: 3600,
    })
    token.addGrant(grant)

    return { token: token.toJwt(), identity, phoneNumber: this.cfg.phoneNumber, provider: 'twilio' }
  }

  generateCallInstruction(to: string, callId: string, record: boolean): string {
    const VoiceResponse = twilio.twiml.VoiceResponse
    const response = new VoiceResponse()

    const toE164 = this.normalizeToE164(to)

    const dial = response.dial({
      callerId: this.cfg.phoneNumber,
      record: record ? 'record-from-answer' : 'do-not-record',
      recordingStatusCallback: record
        ? `${this.cfg.appUrl}/api/calls/status`
        : undefined,
      recordingStatusCallbackMethod: record ? 'POST' : undefined,
      action: `${this.cfg.appUrl}/api/calls/twiml/completed?callId=${callId}`,
      method: 'POST',
    })
    dial.number({}, toE164)

    return response.toString()
  }

  validateWebhookSignature(
    headers: Record<string, string>,
    url: string,
    _rawBody: string,
    params: Record<string, string>
  ): boolean {
    const signature = headers['x-twilio-signature'] ?? ''
    return twilio.validateRequest(this.cfg.authToken, signature, url, params)
  }

  parseOutboundCallRequest(params: Record<string, string>): OutboundCallRequest {
    return {
      clientCallId: params['callId']         || null,
      callSid:      params['CallSid']        ?? '',
      userId:       this.extractUserId(params['Caller'] ?? ''),
      toNumber:     this.normalizeToE164(params['To'] ?? ''),
      leadId:       params['callLeadId']     || null,
      userLeadId:   params['callUserLeadId'] || null,
    }
  }

  parseStatusCallback(params: Record<string, string>): CallStatusUpdate {
    const rawStatus = params['CallStatus'] ?? ''
    const status    = STATUS_MAP[rawStatus] ?? rawStatus
    const duration  = params['CallDuration'] ? parseInt(params['CallDuration'], 10) : null

    // Twilio envia RecordingStatus='completed' quando a gravação está disponível
    const recordingCompleted = params['RecordingStatus'] === 'completed'

    return {
      callSid:           params['CallSid'] ?? '',
      userId:            this.extractUserId(params['Caller'] ?? ''),
      status,
      durationSeconds:   duration,
      recordingSid:      params['RecordingSid']  || null,
      recordingUrl:      params['RecordingUrl']  || null,
      recordingCompleted,
      isTerminal:        TERMINAL_STATUSES.has(status),
    }
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private extractUserId(caller: string): string | null {
    // Twilio envia "client:user_<uuid sem hifens>"
    const raw = caller.replace(/^client:/, '').replace(/^user_/, '')
    if (raw.length !== 32) return null
    return [raw.slice(0,8), raw.slice(8,12), raw.slice(12,16), raw.slice(16,20), raw.slice(20)].join('-')
  }

  private normalizeToE164(phone: string): string {
    try {
      const parsed = parsePhoneNumber(phone)
      if (parsed.isValid()) return parsed.format('E.164')
    } catch { /* fallthrough */ }
    return phone.replace(/[\s\-\(\)]/g, '')
  }
}
