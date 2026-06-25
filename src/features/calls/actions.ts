'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { telephonySettingsSchema } from '@/validations/telephonySettingsSchema'
import { encryptCredential } from '@/lib/crypto/credentials'
import { upsertTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { getCurrentPeriodCredits } from '@/repositories/analysisCreditRepository'
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

  let auth_token_encrypted: string
  let api_key_secret_encrypted: string | null = null

  try {
    auth_token_encrypted = encryptCredential(auth_token)
    if (api_key_secret) {
      api_key_secret_encrypted = encryptCredential(api_key_secret)
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

// --- Get analysis credits ---

export async function getAnalysisCreditsAction(): Promise<AnalysisCredits | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return getCurrentPeriodCredits(supabase, user.id)
}
