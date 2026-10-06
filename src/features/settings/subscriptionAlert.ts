/** Dias de antecedência pra avisar que a renovação está chegando. */
const RENEWAL_ALERT_DAYS = 3

type SubscriptionAlertInput = {
  asaas_subscription_id: string | null
  asaas_next_due_date: string | null
  payment_overdue_since: string | null
}

/**
 * Bolinha vermelha em "Assinatura": vale só pra assinatura do Asaas (liberação
 * manual não tem cobrança). Acende quando há cobrança vencida ou o próximo
 * vencimento está a até 3 dias (ou já passou). Data de hoje no fuso de SP.
 */
export function hasSubscriptionAlert(profile: SubscriptionAlertInput, today: Date = new Date()): boolean {
  if (!profile.asaas_subscription_id) return false
  if (profile.payment_overdue_since) return true
  if (!profile.asaas_next_due_date) return false

  const todayISO = today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const limit = new Date(`${todayISO}T12:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + RENEWAL_ALERT_DAYS)
  return profile.asaas_next_due_date <= limit.toISOString().slice(0, 10)
}
