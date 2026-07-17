'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { telephonySettingsSchema } from '@/validations/telephonySettingsSchema'
import { claimTelnyxNumberSchema } from '@/validations/claimTelnyxNumberSchema'
import { forwardingDetailsSchema } from '@/validations/forwardingDetailsSchema'
import { encryptCredential } from '@/lib/crypto/credentials'
import { getTelephonySettings, upsertTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { getCurrentPeriodCredits } from '@/repositories/analysisCreditRepository'
import { claimTelnyxNumber } from '@/repositories/telnyxNumberRepository'
import { updateCompanyProfile } from '@/repositories/companyProfileRepository'
import type { AnalysisCredits } from '@/types/calls'

// --- Save telephony settings ---

export type SaveTelephonySettingsState = {
  errors?: {
    account_sid?: string[]
    auth_token?: string[]
    api_key_sid?: string[]
    api_key_secret?: string[]
    phone_number?: string[]
    twiml_app_sid?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function saveTelephonySettingsAction(
  _state: SaveTelephonySettingsState,
  formData: FormData
): Promise<SaveTelephonySettingsState> {
  const validation = telephonySettingsSchema.safeParse({
    account_sid:   formData.get('account_sid'),
    auth_token:    formData.get('auth_token'),
    api_key_sid:   formData.get('api_key_sid') || undefined,
    api_key_secret: formData.get('api_key_secret') || undefined,
    phone_number:  formData.get('phone_number'),
    twiml_app_sid: formData.get('twiml_app_sid') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { account_sid, auth_token, api_key_sid, api_key_secret, phone_number, twiml_app_sid } = validation.data

  // Se campos secretos vieram vazios, mantém os valores já criptografados no banco
  const existing = (!auth_token || !api_key_secret)
    ? await getTelephonySettings(supabase, user.id)
    : null

  if (!auth_token && !existing) {
    return { errors: { auth_token: ['Auth Token é obrigatório no primeiro cadastro.'] } }
  }

  let auth_token_encrypted: string
  let api_key_secret_encrypted: string | null = null

  try {
    auth_token_encrypted = auth_token
      ? encryptCredential(auth_token)
      : existing!.auth_token_encrypted
    if (api_key_secret) {
      api_key_secret_encrypted = encryptCredential(api_key_secret)
    } else if (existing?.api_key_secret_encrypted) {
      api_key_secret_encrypted = existing.api_key_secret_encrypted
    }
  } catch {
    return { error: 'Erro de configuração do servidor. Contate o suporte.' }
  }

  const result = await upsertTelephonySettings(supabase, user.id, {
    account_sid,
    auth_token_encrypted,
    api_key_sid: api_key_sid ?? null,
    api_key_secret_encrypted,
    phone_number,
    twiml_app_sid: twiml_app_sid ?? null,
  })

  if (!result) {
    return { error: 'Erro ao salvar configurações. Tente novamente.' }
  }

  return { success: true }
}

// --- Save call notes ---

export async function saveCallNotesAction(callId: string, notes: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { updateCallNotes } = await import('@/repositories/callRepository')
  const ok = await updateCallNotes(supabase, callId, user.id, notes)
  return { ok }
}

// --- Apply AI-suggested lead status ---

export async function applyCallSuggestedStatusAction(formData: FormData): Promise<void> {
  const status = formData.get('status') as string | null
  const leadId = formData.get('lead_id') as string | null
  const userLeadId = formData.get('user_lead_id') as string | null

  if (!status || (!leadId && !userLeadId)) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (leadId) {
    const { updateLeadStatus } = await import('@/repositories/leadRepository')
    await updateLeadStatus(supabase, user.id, leadId, status)
    revalidatePath(`/leads/${leadId}`)
  } else if (userLeadId) {
    await supabase
      .from('user_leads')
      .update({ status })
      .eq('id', userLeadId)
      .eq('user_id', user.id)
    revalidatePath(`/leads/global/${userLeadId}`)
  }
}

// --- Claim a Telnyx number (encaminhamento de chamadas de entrada) ---

export type ClaimTelnyxNumberState = {
  errors?: {
    number_id?: string[]
    cpf_cnpj?: string[]
    forwarding_cell_phone?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function claimTelnyxNumberAction(
  _state: ClaimTelnyxNumberState,
  formData: FormData
): Promise<ClaimTelnyxNumberState> {
  const validation = claimTelnyxNumberSchema.safeParse({
    number_id: formData.get('number_id'),
    cpf_cnpj: formData.get('cpf_cnpj'),
    forwarding_cell_phone: formData.get('forwarding_cell_phone'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { number_id, cpf_cnpj, forwarding_cell_phone } = validation.data

  const profile = await updateCompanyProfile(supabase, user.id, { cpf_cnpj, forwarding_cell_phone })
  if (!profile) {
    return { error: 'Erro ao salvar CPF/CNPJ e celular. Tente novamente.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  try {
    await claimTelnyxNumber(adminSupabase, user.id, number_id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('number_not_available')) {
      return { error: 'Este número acabou de ser reservado por outro usuário. Escolha outro.' }
    }
    if (msg.includes('user_already_has_number')) {
      return { error: 'Você já tem um número atribuído.' }
    }
    return { error: 'Erro ao reivindicar número. Tente novamente.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

// --- Complete CPF/CNPJ + celular (número já atribuído, ex.: pelo admin) ---

export type ForwardingDetailsState = {
  errors?: {
    cpf_cnpj?: string[]
    forwarding_cell_phone?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function completeForwardingDetailsAction(
  _state: ForwardingDetailsState,
  formData: FormData
): Promise<ForwardingDetailsState> {
  const validation = forwardingDetailsSchema.safeParse({
    cpf_cnpj: formData.get('cpf_cnpj'),
    forwarding_cell_phone: formData.get('forwarding_cell_phone'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await updateCompanyProfile(supabase, user.id, validation.data)
  if (!profile) {
    return { error: 'Erro ao salvar CPF/CNPJ e celular. Tente novamente.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

// --- Get analysis credits ---

export async function getAnalysisCreditsAction(): Promise<AnalysisCredits | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return getCurrentPeriodCredits(supabase, user.id)
}
