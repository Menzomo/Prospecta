import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type UserSyncStatus = Database['public']['Tables']['user_sync_status']['Row']

export async function getSyncStatus(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSyncStatus | null> {
  const { data, error } = await supabase
    .from('user_sync_status')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[userSyncStatusRepository.getSyncStatus]', { code: error.code, message: error.message })
    return null
  }

  return data
}

export async function touchEmailSync(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_sync_status')
    .upsert(
      { user_id: userId, last_email_sync: now, updated_at: now },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[userSyncStatusRepository.touchEmailSync]', { code: error.code, message: error.message })
  }
}

export async function touchCallSync(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_sync_status')
    .upsert(
      { user_id: userId, last_call_sync: now, updated_at: now },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[userSyncStatusRepository.touchCallSync]', { code: error.code, message: error.message })
  }
}
