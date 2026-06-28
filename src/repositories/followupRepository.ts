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

export async function getFollowupsByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<Followup[]> {
  const { data, error } = await supabase
    .from('followups')
    .select('*')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('due_at', { ascending: true })

  if (error) return []
  return data
}

export async function getPendingFollowupsByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FollowupWithLead[]> {
  const now = new Date().toISOString()

  // no_reply só aparece quando já vencido (due_at <= now); manuais passam sempre.
  const { data, error } = await supabase
    .from('followups')
    .select('*, leads(company_name, last_reply_at, status), user_leads(global_leads(company_name))')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .or(`type.neq.no_reply,due_at.lte.${now}`)
    .order('due_at', { ascending: true })

  if (error) return []
  // Cast necessário: Relationships vazio em types.ts impede inferência do join
  const all = data as unknown as FollowupWithLead[]
  // Ocultar no_reply quando lead respondeu após a criação do acompanhamento.
  // Para user_leads não há last_reply_at disponível — exibir sempre.
  // Não pode ser movido para o banco sem RPC: compara campo do join com campo da tabela principal.
  return all.filter((f) => {
    if (f.type !== 'no_reply') return true
    if (f.user_lead_id && !f.lead_id) return true
    const lastReplyAt = f.leads?.last_reply_at
    if (!lastReplyAt) return true
    return new Date(lastReplyAt) <= new Date(f.created_at)
  })
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
