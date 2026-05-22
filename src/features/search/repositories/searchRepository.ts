import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function countLeadsSavedTodayFromSearch(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const startOfDayUtc = new Date()
  startOfDayUtc.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'google_maps')
    .gte('created_at', startOfDayUtc.toISOString())

  if (error) return 0
  return count ?? 0
}
