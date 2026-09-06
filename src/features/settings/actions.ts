'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { companyProfileSchema } from '@/validations/companyProfileSchema'
import { subscribeSchema } from '@/validations/subscribeSchema'
import { updateCompanyProfile, getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getProfileById, updateProfileSubscription } from '@/repositories/profileRepository'
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getPixQrCode,
  setAsaasSubscriptionCreditCard,
  findSubscriptionPayment,
  switchPendingPaymentToPix,
  alertBillingError,
} from '@/services/asaasService'
import { closeUserAccount } from '@/services/subscriptionService'
import { sendEmail, SUPPORT_EMAIL } from '@/lib/email'

async function getRemoteIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? '127.0.0.1'
}

// --- Fale conosco ---

export type ContactActionState = { error?: string; success?: boolean } | null

export async function sendContactMessageAction(
  _state: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const subject = (formData.get('subject') as string | null)?.trim()
  const message = (formData.get('message') as string | null)?.trim()
  if (!subject || !message) return { error: 'Preencha assunto e mensagem.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const company = await getCompanyProfileByUserId(supabase, user.id)
  const body = `De: ${company?.company_name ?? 'Sem nome'} (${user.email})\n\n${message}`

  try {
    await sendEmail(SUPPORT_EMAIL, `[Fale Conosco] ${subject}`, body, { replyTo: user.email ?? undefined })
  } catch (err) {
    console.error('[sendContactMessageAction]', err)
    return { error: `Erro ao enviar. Tente de novo ou manda um email direto pra ${SUPPORT_EMAIL}.` }
  }

  return { success: true }
}

export type UpdateCompanyActionState = {
  errors?: {
    company_name?: string[]
    description?: string[]
    city?: string[]
    phone?: string[]
    commercial_email?: string[]
    website?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function updateCompanyAction(
  _state: UpdateCompanyActionState,
  formData: FormData
): Promise<UpdateCompanyActionState> {
  const validation = companyProfileSchema.safeParse({
    company_name: formData.get('company_name'),
    description: formData.get('description') || undefined,
    city: formData.get('city') || undefined,
    phone: formData.get('phone') || undefined,
    commercial_email: formData.get('commercial_email') || undefined,
    website: formData.get('website') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const company = await updateCompanyProfile(supabase, user.id, validation.data)

  if (!company) {
    return { error: 'Erro ao atualizar dados da empresa. Tente novamente.' }
  }

  return { success: true }
}

// --- Assinar (Fase 8 — Asaas) ---

export type SubscribeActionState = {
  errors?: { cpf_cnpj?: string[] }
  error?: string
  qrCode?: string
  payload?: string
} | null

export async function subscribeAction(
  _state: SubscribeActionState,
  formData: FormData
): Promise<SubscribeActionState> {
  const validation = subscribeSchema.safeParse({
    cpf_cnpj: formData.get('cpf_cnpj') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  let company = await getCompanyProfileByUserId(supabase, user.id)

  if (!company?.cpf_cnpj) {
    if (!validation.data.cpf_cnpj) {
      return { errors: { cpf_cnpj: ['CPF ou CNPJ é obrigatório'] } }
    }
    company = await updateCompanyProfile(supabase, user.id, { cpf_cnpj: validation.data.cpf_cnpj })
    if (!company) return { error: 'Erro ao salvar CPF/CNPJ. Tente novamente.' }
  }

  const profile = await getProfileById(supabase, user.id)

  try {
    let customerId = profile?.asaas_customer_id ?? null
    if (!customerId) {
      customerId = await createAsaasCustomer({
        name: company.company_name,
        email: user.email ?? company.commercial_email ?? '',
        cpfCnpj: company.cpf_cnpj!,
      })
      await updateProfileSubscription(adminSupabase, user.id, { asaas_customer_id: customerId })
    }

    const { subscriptionId, firstPaymentId } = await createAsaasSubscription({
      customerId,
      externalReference: `subscription:${user.id}`,
    })
    await updateProfileSubscription(adminSupabase, user.id, { asaas_subscription_id: subscriptionId })

    if (!firstPaymentId) {
      return { error: 'Assinatura criada, mas a primeira cobrança ainda não está disponível. Atualize a página em instantes.' }
    }

    const qr = await getPixQrCode(firstPaymentId)
    return { qrCode: qr.encodedImage, payload: qr.payload }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar assinatura.'
    console.error('[subscribeAction]', msg)
    await alertBillingError(`assinar (userId=${user.id})`, err)
    return { error: msg }
  }
}

// --- Cartão de crédito (opcional, na assinatura já criada via Pix) ---

export type SetCreditCardActionState = { error?: string; success?: boolean } | null

/**
 * Cadastra/troca o cartão da assinatura (PUT /subscriptions/{id}/creditCard)
 * — funciona tanto pra quem nunca teve cartão (assinatura criada via Pix)
 * quanto pra trocar um já cadastrado. Não existe "remover cartão sem
 * trocar" na API da Asaas — não oferecemos essa opção.
 */
export async function setCreditCardAction(
  _state: SetCreditCardActionState,
  formData: FormData
): Promise<SetCreditCardActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileById(supabase, user.id)
  if (!profile?.asaas_subscription_id) {
    return { error: 'Você precisa assinar antes de cadastrar um cartão.' }
  }

  const holderName = (formData.get('holder_name') as string | null)?.trim() ?? ''
  const number = (formData.get('number') as string | null)?.replace(/\D/g, '') ?? ''
  const expiryMonth = (formData.get('expiry_month') as string | null)?.trim() ?? ''
  const expiryYear = (formData.get('expiry_year') as string | null)?.trim() ?? ''
  const ccv = (formData.get('ccv') as string | null)?.trim() ?? ''
  const postalCode = (formData.get('postal_code') as string | null)?.replace(/\D/g, '') ?? ''
  const addressNumber = (formData.get('address_number') as string | null)?.trim() ?? ''
  const phone = (formData.get('phone') as string | null)?.replace(/\D/g, '') ?? ''

  if (!holderName || !number || !expiryMonth || !expiryYear || !ccv || !postalCode || !addressNumber) {
    return { error: 'Preencha todos os campos do cartão.' }
  }

  const company = await getCompanyProfileByUserId(supabase, user.id)

  try {
    await setAsaasSubscriptionCreditCard({
      subscriptionId: profile.asaas_subscription_id,
      remoteIp: await getRemoteIp(),
      creditCard: { holderName, number, expiryMonth, expiryYear, ccv },
      creditCardHolderInfo: {
        name: holderName,
        email: user.email ?? '',
        cpfCnpj: company?.cpf_cnpj ?? '',
        postalCode,
        addressNumber,
        phone,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao cadastrar cartão.'
    console.error('[setCreditCardAction]', msg)
    await alertBillingError(`cadastrar cartão (userId=${user.id})`, err)
    return { error: msg }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()
  await updateProfileSubscription(adminSupabase, user.id, { asaas_has_card: true })

  return { success: true }
}

// --- Regularizar cobrança vencida via Pix (assinante de cartão) ---

export type PayOverdueActionState = { error?: string; qrCode?: string; payload?: string } | null

export async function payOverdueViaPixAction(
  _state: PayOverdueActionState,
  _formData: FormData
): Promise<PayOverdueActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileById(supabase, user.id)
  if (!profile?.asaas_subscription_id) return { error: 'Nenhuma assinatura encontrada.' }

  try {
    const payment = await findSubscriptionPayment(profile.asaas_subscription_id, ['PENDING', 'OVERDUE'])
    if (!payment) return { error: 'Nenhuma cobrança pendente encontrada.' }

    const qr = await switchPendingPaymentToPix(payment.id)
    return { qrCode: qr.encodedImage, payload: qr.payload }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar Pix.'
    console.error('[payOverdueViaPixAction]', msg)
    await alertBillingError(`pagar vencido via pix (userId=${user.id})`, err)
    return { error: msg }
  }
}

// --- Encerrar conta (desativação self-service) ---

export type CloseAccountActionState = { error?: string } | null

const REFUND_WINDOW_DAYS = 7

/**
 * Desativação reversível, não apaga dados: reembolsa automaticamente se
 * ainda estiver dentro de 7 dias do pagamento, cancela a cobrança
 * recorrente, libera o número Telnyx pro pool, derruba todas as sessões
 * ativas e bloqueia login futuro (loginAction checa
 * subscription_status='canceled'). Cobrança é cancelada ANTES de qualquer
 * outra coisa — se isso falhar, para tudo, nunca libera número/encerra a
 * conta com cobrança ainda ativa.
 */
export async function closeAccountAction(
  _state: CloseAccountActionState,
  formData: FormData
): Promise<CloseAccountActionState> {
  const password = (formData.get('password') as string | null) ?? ''
  if (!password) return { error: 'Informe sua senha atual pra confirmar.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login')

  // Reautentica com a senha digitada — camada extra de confirmação antes de
  // uma ação irreversível pelo próprio usuário (não existe modal de
  // confirmação forte no app, só window.confirm no cliente).
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (authError) return { error: 'Senha incorreta.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  const profile = await getProfileById(supabase, user.id)

  let refundPaymentId: string | null = null
  if (profile?.asaas_subscription_id && profile.subscription_paid_at) {
    const daysSincePaid = (Date.now() - new Date(profile.subscription_paid_at).getTime()) / 86_400_000
    if (daysSincePaid <= REFUND_WINDOW_DAYS) {
      try {
        const payment = await findSubscriptionPayment(profile.asaas_subscription_id, ['CONFIRMED', 'RECEIVED'])
        refundPaymentId = payment?.id ?? null
      } catch (err) {
        console.error('[closeAccountAction] falha ao buscar pagamento pro reembolso', err)
        await alertBillingError(`buscar pagamento pro reembolso (userId=${user.id})`, err)
      }
    }
  }

  try {
    await closeUserAccount(adminSupabase, user.id, {
      asaasSubscriptionId: profile?.asaas_subscription_id ?? null,
      refundPaymentId,
      requireAsaasCancelSuccess: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao cancelar assinatura.'
    return { error: `Não foi possível cancelar sua assinatura (${msg}). Tente de novo ou contate o suporte.` }
  }

  await supabase.auth.signOut()
  redirect('/login')
}
