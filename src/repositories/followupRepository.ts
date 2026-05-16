import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Followup, CreateFollowupDto, UpdateFollowupDto, FollowupWithLead } from '@/types/followups'

export async function createFollowup(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateFollowupDto
): Promise<Followup | null> {
  const { data, error } = await supabase
    .from('followups')
    .insert({ user_id: userId, status: 'pending', ...dto })
    .select()
    .single()

  if (error) {
    console.error('[followupRepository.createFollowup] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return data
}

export async function getFollowupsByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<Followup[]> {
  const { data, error } = await supabase
    .from('followups')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('due_at', { ascending: true })

  if (error) return []
  return data
}

export async function getPendingFollowupsByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FollowupWithLead[]> {
  const { data, error } = await supabase
    .from('followups')
    .select('*, leads(company_name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true })

  if (error) return []
  // Cast necessário: Relationships vazio em types.ts impede inferência do join
  return data as unknown as FollowupWithLead[]
}

export async function updateFollowup(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  dto: UpdateFollowupDto
): Promise<Followup | null> {
  const { data, error } = await supabase
    .from('followups')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('[followupRepository.updateFollowup] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return data
}

export async function updateFollowupStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  status: string
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('followups')
    .update({
      status,
      updated_at: now,
      ...(status === 'completed' && { completed_at: now }),
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[followupRepository.updateFollowupStatus] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}
