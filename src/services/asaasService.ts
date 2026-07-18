// Cliente da API do Asaas (gateway de pagamento) — fetch nativo, sem SDK,
// mesmo padrão usado pra chamar o webhook do n8n em callService.ts.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { creditWallet } from '@/repositories/walletRepository'
import { updateProfileSubscription } from '@/repositories/profileRepository'

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
}): Promise<{ subscriptionId: string; firstPaymentId: string | null }> {
  const subscription = await asaasFetch<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED', // Asaas oferece Pix e cartão no checkout
      value: SUBSCRIPTION_VALUE,
      nextDueDate: todayISODate(),
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
  if (!CONFIRMED_EVENTS.has(payload.event) || !payload.payment) {
    console.log('[asaasService] evento ignorado:', payload.event)
    return { ok: true }
  }

  const { id: paymentId, value, externalReference } = payload.payment

  if (!externalReference) {
    console.warn('[asaasService] pagamento sem externalReference:', paymentId)
    return { ok: true }
  }

  const [kind, userId] = externalReference.split(':')

  if (kind === 'recharge' && userId) {
    try {
      await creditWallet(adminSupabase, userId, value, 'recharge', paymentId, 'Recarga Pix')
    } catch (err) {
      console.error('[asaasService] falha ao creditar recarga:', err)
    }
    return { ok: true }
  }

  if (kind === 'subscription' && userId) {
    await updateProfileSubscription(adminSupabase, userId, {
      subscription_status: 'active',
      subscription_source: 'asaas',
      subscription_paid_at: new Date().toISOString(),
    })
    return { ok: true }
  }

  console.warn('[asaasService] externalReference não reconhecido:', externalReference)
  return { ok: true }
}
