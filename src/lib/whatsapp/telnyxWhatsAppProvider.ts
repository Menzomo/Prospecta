// ÚNICO arquivo no projeto que chama a API de mensageria WhatsApp da Telnyx.
// Nenhum outro módulo deve fazer fetch pra api.telnyx.com/v2/messages diretamente.

import { createPublicKey, verify as cryptoVerify } from 'crypto'
import type {
  IWhatsAppProvider,
  SendTextResult,
  WhatsAppWebhookEvent,
} from './IWhatsAppProvider'

const BASE_URL = 'https://api.telnyx.com'

const KNOWN_STATUSES = new Set(['sent', 'delivered', 'read', 'failed'])

export class TelnyxWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(from: string, to: string, body: string): Promise<SendTextResult> {
    const apiKey = process.env.TELNYX_API_KEY
    if (!apiKey) throw new Error('Telnyx: TELNYX_API_KEY não configurada')

    const res = await fetch(`${BASE_URL}/v2/messages/whatsapp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        whatsapp_message: {
          type: 'text',
          text: { body, preview_url: false },
        },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`Telnyx WhatsApp envio falhou: HTTP ${res.status} ${errBody}`)
    }

    const data = await res.json()
    const providerMessageId: string | undefined = data?.data?.id
    if (!providerMessageId) throw new Error('Telnyx WhatsApp: resposta sem id de mensagem')

    return { providerMessageId }
  }

  // Mesma lógica de src/lib/telephony/telnyxProvider.ts — copiada em vez de
  // importada pra não arriscar mexer no código de ligação já corrigido nesta
  // sessão. Mesma chave pública (TELNYX_PUBLIC_KEY), mesma conta Telnyx.
  validateWebhookSignature(headers: Record<string, string>, rawBody: string): boolean {
    const signature = headers['telnyx-signature-ed25519']
    const timestamp = headers['telnyx-timestamp']
    if (!signature || !timestamp) return false

    const ts = parseInt(timestamp, 10)
    if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

    const publicKey = process.env.TELNYX_PUBLIC_KEY
    if (!publicKey) return false

    try {
      const pubKeyBytes = Buffer.from(publicKey, 'base64')
      const pubKey = createPublicKey({
        format: 'jwk',
        key: { kty: 'OKP', crv: 'Ed25519', x: pubKeyBytes.toString('base64url') },
      })
      const message = Buffer.from(`${timestamp}|${rawBody}`)
      const sigBytes = Buffer.from(signature, 'base64')
      return cryptoVerify(null, message, pubKey, sigBytes)
    } catch {
      return false
    }
  }

  /**
   * IMPORTANTE: a Telnyx não documenta publicamente o formato exato do
   * payload de webhook do WhatsApp (só confirmamos o formato de SMS, que
   * usamos aqui como melhor palpite — mesmo envelope data/event_type/payload
   * das outras mensagens da Messaging API). Isso precisa ser confirmado
   * assim que o primeiro webhook real chegar — o handler loga o rawBody
   * completo em qualquer evento não reconhecido, exatamente pra isso.
   */
  parseWebhookEvent(rawBody: string): WhatsAppWebhookEvent {
    let json: { data?: { event_type?: string; payload?: Record<string, unknown> } }
    try {
      json = JSON.parse(rawBody)
    } catch {
      return { type: 'ignored' }
    }

    const eventType = json.data?.event_type
    const payload = json.data?.payload
    if (!eventType || !payload) return { type: 'ignored' }

    if (eventType === 'message.received') {
      const from = payload.from as { phone_number?: string } | string | undefined
      const to = payload.to as Array<{ phone_number?: string }> | string | undefined
      const fromNumber = typeof from === 'string' ? from : from?.phone_number
      const toNumber = typeof to === 'string' ? to : Array.isArray(to) ? to[0]?.phone_number : undefined
      const text = payload.text as string | { body?: string } | undefined
      const body = typeof text === 'string' ? text : text?.body
      const id = payload.id as string | undefined

      if (!fromNumber || !toNumber || !body || !id) return { type: 'ignored' }

      return { type: 'inbound_message', fromNumber, toNumber, body, providerMessageId: id }
    }

    if (eventType.startsWith('message.')) {
      const status = eventType.replace('message.', '')
      const id = payload.id as string | undefined
      if (id && KNOWN_STATUSES.has(status)) {
        return { type: 'status_update', providerMessageId: id, status: status as 'sent' | 'delivered' | 'read' | 'failed' }
      }
    }

    return { type: 'ignored' }
  }
}
