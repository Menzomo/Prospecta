import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { UserLead, CreateUserLeadDto, UpdateUserLeadDto } from '@/types/globalLeads'

export type UserLeadWithGlobalData = {
  id: string
  status: string
  created_at: string
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  category_id: string | null
}

export async function getUserLeadsWithGlobalData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserLeadWithGlobalData[]> {
  const { data, error } = await supabase
    .from('user_leads')
    .select('id, status, created_at, global_leads(company_name, email, website, phone, city, state, category_id)')
    .eq('user_id', userId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data ?? [])
    .filter((row) => row.global_leads != null)
    .map((row) => {
      const g = row.global_leads as unknown as {
        company_name: string
        email: string | null
        website: string | null
        phone: string | null
        city: string | null
        state: string | null
        category_id: string | null
      }
      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        company_name: g.company_name,
        email: g.email,
        website: g.website,
        phone: g.phone,
        city: g.city,
        state: g.state,
        category_id: g.category_id,
      }
    })
}

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

export async function markUserLeadContacted(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_leads')
    .update({ status: 'contatado', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[userLeadRepository.markUserLeadContacted] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}
