import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TelephonySettings, UpsertTelephonySettingsDto } from '@/types/calls'
import { getAssignedNumber } from '@/repositories/telnyxNumberRepository'

// No modo Telnyx, "configurado" é ter número atribuído — telephony_settings é exclusiva do modo Twilio (BYOC).
export async function hasTelephonyConfigured(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  if (process.env.TELEPHONY_PROVIDER === 'telnyx') {
    const assignedNumber = await getAssignedNumber(supabase, userId)
    return assignedNumber !== null
  }
  const settings = await getTelephonySettings(supabase, userId)
  return settings !== null
}

export async function getTelephonySettings(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TelephonySettings | null> {
  const { data, error } = await supabase
    .from('telephony_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[telephonySettingsRepository.getTelephonySettings]', error.message)
    return null
  }
  return data
}

export async function upsertTelephonySettings(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: UpsertTelephonySettingsDto
): Promise<TelephonySettings | null> {
  const { data, error } = await supabase
    .from('telephony_settings')
    .upsert(
      { user_id: userId, ...dto, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[telephonySettingsRepository.upsertTelephonySettings]', error.message)
    return null
  }
  return data
}
