import { parsePhoneNumber } from 'libphonenumber-js'

/**
 * Números vindos de webhooks da Telnyx já chegam em E.164 (país implícito).
 * Números salvos em leads/global_leads têm formato livre — passar defaultCountry
 * garante que o parser resolva DDDs brasileiros sem código de país.
 */
export function normalizeToE164(phone: string, defaultCountry?: 'BR'): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry)
    if (parsed.isValid()) return parsed.format('E.164')
  } catch { /* fallthrough */ }
  return phone.replace(/[\s\-\(\)]/g, '')
}
