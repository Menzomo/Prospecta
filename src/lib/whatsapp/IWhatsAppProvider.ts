// Contrato que todo provedor de WhatsApp deve implementar.
// Nenhum arquivo fora de src/lib/whatsapp/ deve importar o SDK/cliente HTTP de qualquer provedor.

export interface SendTextResult {
  providerMessageId: string
}

export type InboundMessageEvent = {
  type: 'inbound_message'
  fromNumber: string
  toNumber: string
  body: string
  providerMessageId: string
}

export type StatusUpdateEvent = {
  type: 'status_update'
  providerMessageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

export type WhatsAppWebhookEvent = InboundMessageEvent | StatusUpdateEvent | { type: 'ignored' }

export interface IWhatsAppProvider {
  sendTextMessage(from: string, to: string, body: string): Promise<SendTextResult>

  /**
   * Valida a assinatura Ed25519 do webhook (mesmo mecanismo usado em
   * telefonia). rawBody precisa ser o corpo exato recebido, sem re-serializar.
   */
  validateWebhookSignature(headers: Record<string, string>, rawBody: string): boolean

  parseWebhookEvent(rawBody: string): WhatsAppWebhookEvent
}
