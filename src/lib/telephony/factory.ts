// Cria a implementação correta de ITelephonyProvider a partir das configurações do usuário.
// Faz a descriptografia das credenciais antes de instanciar o provedor.
// As rotas e o callService obtêm o provedor EXCLUSIVAMENTE por aqui.

import type { TelephonySettings } from '@/types/calls'
import { decryptCredential } from '@/lib/crypto/credentials'
import { TwilioProvider } from './twilioProvider'
import { TelnyxProvider } from './telnyxProvider'
import type { ITelephonyProvider } from './ITelephonyProvider'

export function createProviderFromSettings(settings: TelephonySettings): ITelephonyProvider {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não configurada.')

  let authToken: string
  let apiKeySecret: string | null = null

  try {
    authToken = decryptCredential(settings.auth_token_encrypted)
    if (settings.api_key_secret_encrypted) {
      apiKeySecret = decryptCredential(settings.api_key_secret_encrypted)
    }
  } catch {
    throw new Error('Falha ao descriptografar credenciais Twilio. Verifique TELEPHONY_MASTER_KEY.')
  }

  return new TwilioProvider({
    accountSid:   settings.account_sid,
    authToken,
    apiKeySid:    settings.api_key_sid,
    apiKeySecret,
    phoneNumber:  settings.phone_number,
    twimlAppSid:  settings.twiml_app_sid,
    appUrl,
  })
}

/**
 * Retorna um provider baseado na env var TELEPHONY_PROVIDER.
 * Uso futuro: quando Telnyx for ativado no nível de plataforma (sem settings por usuário).
 * Twilio exige credenciais por usuário — use createProviderFromSettings() para ele.
 */
export function getProviderByEnv(): ITelephonyProvider {
  const provider = process.env.TELEPHONY_PROVIDER ?? 'twilio'
  if (provider === 'telnyx') return new TelnyxProvider()
  throw new Error('getProviderByEnv: twilio requer createProviderFromSettings(settings)')
}
