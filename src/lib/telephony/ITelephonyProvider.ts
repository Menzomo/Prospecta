// Contrato que todo provedor de telefonia deve implementar.
// Nenhum arquivo fora de src/lib/telephony/ deve importar o SDK de qualquer provedor.

export interface AccessTokenResult {
  token: string
  identity: string
  phoneNumber: string
}

// Parâmetros extraídos do webhook que inicia uma chamada (equivalente ao /twiml do Twilio)
export interface OutboundCallRequest {
  clientCallId: string | null   // UUID gerado pelo browser para correlação imediata
  callSid: string
  userId: string | null         // extraído da identidade gerada em generateAccessToken
  toNumber: string
  leadId: string | null
  userLeadId: string | null
}

// Parâmetros extraídos do webhook de status/encerramento
export interface CallStatusUpdate {
  callSid: string
  userId: string | null
  status: string                // normalizado para os valores de CALL_STATUSES
  durationSeconds: number | null
  recordingSid: string | null
  recordingUrl: string | null   // URL da gravação no provedor (antes da transferência)
  recordingCompleted: boolean   // true quando a gravação está disponível para download
  isTerminal: boolean           // true quando a chamada não mudará mais de status
}

export interface ITelephonyProvider {
  /**
   * Gera token de curta duração (≈1h) para o SDK browser inicializar.
   * O userId é codificado na identidade para ser recuperado nos callbacks.
   */
  generateAccessToken(userId: string): AccessTokenResult

  /**
   * Gera a instrução (TwiML, SDP, etc.) que conecta a chamada ao destinatário.
   * O callId é passado de volta pelo provedor no status callback para correlação.
   */
  generateCallInstruction(to: string, callId: string, record: boolean): string

  /**
   * Valida que o webhook veio realmente deste provedor (não de terceiros).
   * Retorna true se a assinatura for válida.
   */
  validateWebhookSignature(signature: string, url: string, params: Record<string, string>): boolean

  /**
   * Transforma os parâmetros brutos do webhook de início de chamada
   * em uma estrutura normalizada.
   */
  parseOutboundCallRequest(params: Record<string, string>): OutboundCallRequest

  /**
   * Transforma os parâmetros brutos do webhook de status/encerramento
   * em uma estrutura normalizada.
   */
  parseStatusCallback(params: Record<string, string>): CallStatusUpdate

}
