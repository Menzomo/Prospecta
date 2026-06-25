import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TelephonySettings, UpsertTelephonySettingsDto } from '@/types/calls'

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
