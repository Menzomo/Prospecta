import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type TelnyxNumber = {
  id: string
  phone_number: string
  status: string
  user_id: string | null
  assigned_at: string | null
}

export async function getAssignedNumber(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TelnyxNumber | null> {
  const { data, error } = await supabase
    .from('telnyx_numbers')
    .select('id, phone_number, status, user_id, assigned_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[telnyxNumberRepository.getAssignedNumber]', error.message)
    return null
  }
  return data
}

export async function getAvailableNumbers(
  supabase: SupabaseClient<Database>,
  limit = 20
): Promise<TelnyxNumber[]> {
  const { data, error } = await supabase
    .from('telnyx_numbers')
    .select('id, phone_number, status, user_id, assigned_at')
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[telnyxNumberRepository.getAvailableNumbers]', error.message)
    return []
  }
  return data ?? []
}

/**
 * Reivindica um número via RPC atômica (SELECT ... FOR UPDATE, ver migration
 * 20260716000000). Deve ser chamado com adminSupabase (RPC é SECURITY DEFINER,
 * grant de EXECUTE só pra service_role).
 */
export async function claimTelnyxNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: SupabaseClient<Database> | SupabaseClient<any>,
  userId: string,
  numberId: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any).rpc('claim_telnyx_number', {
    p_user_id:   userId,
    p_number_id: numberId,
  })

  if (error) throw new Error(error.message)
  return String(data)
}
