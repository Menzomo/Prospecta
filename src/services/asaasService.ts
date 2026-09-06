// Cliente da API do Asaas (gateway de pagamento) — fetch nativo, sem SDK,
// mesmo padrão usado pra chamar o webhook do n8n em callService.ts.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { creditWallet } from '@/repositories/walletRepository'
import { updateProfileSubscription, getProfileById } from '@/repositories/profileRepository'
import { sendEmail, SUPPORT_EMAIL } from '@/lib/email'

/**
 * Avisa o suporte por email em qualquer erro de assinatura/renovação —
 * nunca bloqueia o fluxo principal, é só melhor esforço.
 */
export async function alertBillingError(context: string, error: unknown): Promise<void> {
  const msg = error instanceof Error ? error.message : String(error)
  await sendEmail(SUPPORT_EMAIL, `Erro de cobrança — ${context}`, msg).catch((e) =>
    console.error('[billingAlert] falha ao enviar alerta', e)
  )
}

const SUBSCRIPTION_VALUE = 150.0

function baseUrl(): string {
  return process.env.ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('Asaas: ASAAS_API_KEY não configurada')

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...init?.headers,
    },
  })

  const body = await res.json()
  if (!res.ok) {
    const msg = body?.errors?.[0]?.description ?? `Asaas: erro ${res.status}`
    throw new Error(msg)
  }
  return body as T
}

// Data no formato exigido pelo Asaas (YYYY-MM-DD), hoje.
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function createAsaasCustomer(input: {
  name: string
  email: string
  cpfCnpj: string
}): Promise<string> {
  const customer = await asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
    }),
  })
  return customer.id
}

export async function createAsaasSubscription(input: {
  customerId: string
  externalReference: string
  /**
   * Usado quando o 1º mês já foi pago por fora (liberação manual do admin) —
   * a cobrança na Asaas só começa a valer a partir do 2º mês, em vez de
   * cobrar de novo pelo mês que a pessoa já pagou fora do sistema.
   */
  nextDueDate?: string
}): Promise<{ subscriptionId: string; firstPaymentId: string | null }> {
  const subscription = await asaasFetch<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED', // Asaas oferece Pix e cartão no checkout
      value: SUBSCRIPTION_VALUE,
      nextDueDate: input.nextDueDate ?? todayISODate(),
      cycle: 'MONTHLY',
      description: 'Prospecta — assinatura mensal',
      externalReference: input.externalReference,
    }),
  })

  // Busca a primeira cobrança gerada pra essa assinatura, pra exibir o QR já de cara
  const payments = await asaasFetch<{ data: { id: string }[] }>(
    `/payments?subscription=${subscription.id}&limit=1`
  )

  return { subscriptionId: subscription.id, firstPaymentId: payments.data[0]?.id ?? null }
}

export async function createAsaasPayment(input: {
  customerId: string
  value: number
  description: string
  externalReference: string
}): Promise<string> {
  const payment = await asaasFetch<{ id: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'PIX',
      value: input.value,
      dueDate: todayISODate(),
      description: input.description,
      externalReference: input.externalReference,
    }),
  })
  return payment.id
}

/**
 * Cancela a recorrência de vez (DELETE /v3/subscriptions/{id}) — apaga
 * cobranças pendentes/atrasadas vinculadas, cobranças já pagas continuam
 * registradas. Usada no fluxo de encerrar conta.
 */
export async function cancelAsaasSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

/**
 * PUT /v3/subscriptions/{id}/creditCard — adiciona o primeiro cartão numa
 * assinatura criada como Pix (UNDEFINED) ou troca um cartão já cadastrado.
 * Cobranças pendentes da assinatura passam a usar o cartão novo
 * automaticamente (comportamento documentado pela Asaas) — não precisa
 * recriar a assinatura pra "virar cartão".
 */
export async function setAsaasSubscriptionCreditCard(input: {
  subscriptionId: string
  remoteIp: string
  creditCard: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string }
  creditCardHolderInfo: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
}): Promise<void> {
  await asaasFetch(`/subscriptions/${input.subscriptionId}/creditCard`, {
    method: 'PUT',
    body: JSON.stringify({
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    }),
  })
}

/**
 * POST /v3/payments/{id}/refund — funciona pra Pix (parcial ou total) e
 * cartão. Usado no cancelamento dentro dos 7 dias da assinatura.
 */
export async function refundAsaasPayment(paymentId: string, value?: number): Promise<void> {
  await asaasFetch(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify(value != null ? { value } : {}),
  })
}

/**
 * PUT /v3/payments/{id} — muda o billingType de uma cobrança ainda não paga
 * (pendente ou vencida) pra PIX, mantendo valor/vencimento. Usado quando um
 * assinante de cartão quer regularizar por Pix em vez de esperar o retry
 * automático — uma vez que a cobrança vira PIX e é paga, ela sai do ciclo
 * de retry do cartão (o retry é por cobrança, não por assinatura inteira).
 */
export async function switchPendingPaymentToPix(paymentId: string): Promise<{
  encodedImage: string
  payload: string
  expirationDate: string | null
}> {
  const current = await asaasFetch<{ value: number; dueDate: string }>(`/payments/${paymentId}`)
  await asaasFetch(`/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify({ billingType: 'PIX', value: current.value, dueDate: current.dueDate }),
  })
  return getPixQrCode(paymentId)
}

/**
 * Busca o pagamento mais recente de uma assinatura, tentando cada status na
 * ordem dada — usado tanto pro reembolso (CONFIRMED) quanto pra achar a
 * cobrança vencida que o assinante de cartão quer trocar pra Pix
 * (PENDING, depois OVERDUE).
 */
export async function findSubscriptionPayment(
  subscriptionId: string,
  statuses: string[]
): Promise<{ id: string } | null> {
  for (const status of statuses) {
    const result = await asaasFetch<{ data: { id: string }[] }>(
      `/payments?subscription=${subscriptionId}&status=${status}&limit=1`
    )
    if (result.data[0]) return result.data[0]
  }
  return null
}

export async function getPixQrCode(paymentId: string): Promise<{
  encodedImage: string
  payload: string
  expirationDate: string | null
}> {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`)
}

// ── Webhook ──────────────────────────────────────────────────────────────────

type AsaasWebhookPayload = {
  event: string
  payment?: {
    id: string
    value: number
    externalReference: string | null
    subscription: string | null
  }
}

const CONFIRMED_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
const HANDLED_EVENTS = new Set([...CONFIRMED_EVENTS, 'PAYMENT_OVERDUE'])

/**
 * Processa o webhook do Asaas. Desambigua recarga vs. assinatura pelo prefixo
 * de externalReference ("recharge:<userId>" | "subscription:<userId>").
 * Sempre retorna ok — eventos não tratados só são logados (Asaas reentrega
 * em resposta não-200, então não queremos falhar por evento desconhecido).
 */
export async function handleAsaasWebhook(
  adminSupabase: SupabaseClient<Database>,
  payload: AsaasWebhookPayload
): Promise<{ ok: true }> {
  if (!HANDLED_EVENTS.has(payload.event) || !payload.payment) {
    console.log('[asaasService] evento ignorado:', payload.event)
    return { ok: true }
  }

  const { id: paymentId, value, externalReference } = payload.payment

  if (!externalReference) {
    console.warn('[asaasService] pagamento sem externalReference:', paymentId)
    return { ok: true }
  }

  const [kind, userId] = externalReference.split(':')

  // Cobrança vencida — só marca o início da carência, uma vez (não reinicia
  // a contagem numa segunda cobrança atrasada da mesma dívida). Quem decide
  // desativar/encerrar é o cron check-overdue-subscriptions, não aqui.
  if (payload.event === 'PAYMENT_OVERDUE') {
    if (kind === 'subscription' && userId) {
      try {
        const profile = await getProfileById(adminSupabase, userId)
        if (!profile?.payment_overdue_since) {
          await updateProfileSubscription(adminSupabase, userId, {
            payment_overdue_since: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('[asaasService] falha ao marcar pagamento vencido:', err)
        await alertBillingError(`marcar payment_overdue_since (userId=${userId})`, err)
      }
    }
    return { ok: true }
  }

  if (kind === 'recharge' && userId) {
    try {
      await creditWallet(adminSupabase, userId, value, 'recharge', paymentId, 'Recarga Pix')
    } catch (err) {
      console.error('[asaasService] falha ao creditar recarga:', err)
    }
    return { ok: true }
  }

  if (kind === 'subscription' && userId) {
    try {
      await updateProfileSubscription(adminSupabase, userId, {
        subscription_status: 'active',
        subscription_source: 'asaas',
        subscription_paid_at: new Date().toISOString(),
        payment_overdue_since: null,
      })
    } catch (err) {
      console.error('[asaasService] falha ao ativar assinatura:', err)
      await alertBillingError(`ativar assinatura (userId=${userId})`, err)
    }
    return { ok: true }
  }

  console.warn('[asaasService] externalReference não reconhecido:', externalReference)
  return { ok: true }
}
