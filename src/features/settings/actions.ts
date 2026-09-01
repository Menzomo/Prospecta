'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companyProfileSchema } from '@/validations/companyProfileSchema'
import { subscribeSchema } from '@/validations/subscribeSchema'
import { updateCompanyProfile, getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getProfileById, updateProfileSubscription } from '@/repositories/profileRepository'
import { createAsaasCustomer, createAsaasSubscription, getPixQrCode, cancelAsaasSubscription } from '@/services/asaasService'

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
    return { error: msg }
  }
}

// --- Encerrar conta (desativação self-service) ---

export type CloseAccountActionState = { error?: string } | null

/**
 * Desativação reversível, não apaga dados: cancela a cobrança recorrente,
 * libera o número Telnyx pro pool, derruba todas as sessões ativas e
 * bloqueia login futuro (loginAction checa subscription_status='canceled').
 * Cobrança é cancelada ANTES de qualquer outra coisa — se isso falhar, para
 * tudo, nunca libera número/encerra a conta com cobrança ainda ativa.
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

  if (profile?.asaas_subscription_id) {
    try {
      await cancelAsaasSubscription(profile.asaas_subscription_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao cancelar assinatura.'
      console.error('[closeAccountAction] cancelAsaasSubscription falhou', msg)
      return { error: `Não foi possível cancelar sua assinatura (${msg}). Tente de novo ou contate o suporte.` }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any).rpc('release_telnyx_number', { p_user_id: user.id })

  await updateProfileSubscription(adminSupabase, user.id, { subscription_status: 'canceled' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any).rpc('enforce_session_limit', { p_user_id: user.id, p_max_sessions: 0 })

  await supabase.auth.signOut()
  redirect('/login')
}
