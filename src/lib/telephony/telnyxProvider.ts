// Stub do provedor Telnyx — todos os métodos lançam NotImplementedError.
// Será implementado quando tivermos conta Telnyx ativa e credenciais.

import type {
  ITelephonyProvider,
  AccessTokenResult,
  OutboundCallRequest,
  CallStatusUpdate,
} from './ITelephonyProvider'

export class TelnyxProvider implements ITelephonyProvider {
  readonly name = 'telnyx'

  generateAccessToken(_userId: string): AccessTokenResult {
    throw new Error('TelnyxProvider: generateAccessToken não implementado ainda')
  }

  generateCallInstruction(_to: string, _callId: string, _record: boolean): string {
    throw new Error('TelnyxProvider: generateCallInstruction não implementado ainda')
  }

  validateWebhookSignature(
    _signature: string,
    _url: string,
    _params: Record<string, string>
  ): boolean {
    throw new Error('TelnyxProvider: validateWebhookSignature não implementado ainda')
  }

  parseOutboundCallRequest(_params: Record<string, string>): OutboundCallRequest {
    throw new Error('TelnyxProvider: parseOutboundCallRequest não implementado ainda')
  }

  parseStatusCallback(_params: Record<string, string>): CallStatusUpdate {
    throw new Error('TelnyxProvider: parseStatusCallback não implementado ainda')
  }
}
