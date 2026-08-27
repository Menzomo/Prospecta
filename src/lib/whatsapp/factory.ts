// Cria a implementação correta de IWhatsAppProvider a partir da env var
// WHATSAPP_PROVIDER. A UI e as actions obtêm o provedor EXCLUSIVAMENTE por
// aqui — mesmo padrão de src/lib/routing/factory.ts e src/lib/telephony/factory.ts.

import type { IWhatsAppProvider } from './IWhatsAppProvider'
import { TelnyxWhatsAppProvider } from './telnyxWhatsAppProvider'

export function getWhatsAppProvider(): IWhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER ?? 'telnyx'

  if (provider === 'telnyx') return new TelnyxWhatsAppProvider()

  throw new Error(`getWhatsAppProvider: provedor desconhecido "${provider}"`)
}
