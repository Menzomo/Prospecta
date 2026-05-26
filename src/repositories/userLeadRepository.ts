import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { UserLead, CreateUserLeadDto, UpdateUserLeadDto } from '@/types/globalLeads'

export async function getUserLeads(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserLead[]> {
  const { data, error } = await supabase
    .from('user_leads')
    .select('*')
    .eq('user_id', userId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getUserLeadById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<UserLead | null> {
  const { data, error } = await supabase
    .from('user_leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function findUserLeadByGlobalLead(
  supabase: SupabaseClient<Database>,
  userId: string,
  globalLeadId: string
): Promise<UserLead | null> {
  const { data, error } = await supabase
    .from('user_leads')
    .select('*')
    .eq('user_id', userId)
    .eq('global_lead_id', globalLeadId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function createUserLead(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateUserLeadDto
): Promise<UserLead | null> {
  const { data, error } = await supabase
    .from('user_leads')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[userLeadRepository.createUserLead] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return data
}

export async function updateUserLead(
  supabase: SupabaseClient<Database>,
  id: string,
  dto: UpdateUserLeadDto
): Promise<UserLead | null> {
  const { data, error } = await supabase
    .from('user_leads')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

export async function hideUserLead(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_leads')
    .update({ hidden: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  return !error
}
