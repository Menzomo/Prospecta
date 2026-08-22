import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { LeadVisit, CreateVisitDto, VisitWithLeadInfo, VisitStatus } from '@/types/visits'

const SELECT_WITH_LEAD_INFO =
  '*, leads(company_name, address, latitude, longitude), user_leads(global_leads(company_name, address, latitude, longitude))'

type RawVisitRow = LeadVisit & {
  leads: { company_name: string; address: string | null; latitude: number | null; longitude: number | null } | null
  user_leads: { global_leads: { company_name: string; address: string | null; latitude: number | null; longitude: number | null } | null } | null
}

function toVisitWithLeadInfo(row: RawVisitRow): VisitWithLeadInfo {
  const info = row.leads ?? row.user_leads?.global_leads ?? null
  return {
    ...row,
    company_name: info?.company_name ?? '—',
    address: info?.address ?? null,
    latitude: info?.latitude ?? null,
    longitude: info?.longitude ?? null,
  }
}

export async function createVisit(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateVisitDto
): Promise<LeadVisit | null> {
  const { data, error } = await supabase
    .from('lead_visits')
    .insert({ user_id: userId, status: 'planejada', ...dto })
    .select()
    .single()

  if (error) {
    console.error('[leadVisitRepository.createVisit]', error.message)
    return null
  }
  return data
}

export async function getVisitsByDate(
  supabase: SupabaseClient<Database>,
  userId: string,
  scheduledDate: string
): Promise<VisitWithLeadInfo[]> {
  const { data, error } = await supabase
    .from('lead_visits')
    .select(SELECT_WITH_LEAD_INFO)
    .eq('user_id', userId)
    .eq('scheduled_date', scheduledDate)
    .order('visit_order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[leadVisitRepository.getVisitsByDate]', error.message)
    return []
  }
  return (data ?? []).map((row) => toVisitWithLeadInfo(row as unknown as RawVisitRow))
}

export async function getUpcomingVisitDates(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('lead_visits')
    .select('scheduled_date')
    .eq('user_id', userId)
    .eq('status', 'planejada')
    .order('scheduled_date', { ascending: true })

  if (error) return []
  return [...new Set((data ?? []).map((row) => row.scheduled_date))]
}

export async function getVisitsByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<LeadVisit[]> {
  const { data, error } = await supabase
    .from('lead_visits')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('scheduled_date', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getVisitsByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<LeadVisit[]> {
  const { data, error } = await supabase
    .from('lead_visits')
    .select('*')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('scheduled_date', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function updateVisitStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: VisitStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('lead_visits')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[leadVisitRepository.updateVisitStatus]', error.message)
    return false
  }
  return true
}

/**
 * Grava a ordem otimizada calculada pelo provider de rota — visitIds já vêm
 * na ordem correta, o índice no array vira o valor salvo em visit_order.
 */
export async function saveOptimizedOrder(
  supabase: SupabaseClient<Database>,
  visitIds: string[]
): Promise<boolean> {
  const results = await Promise.all(
    visitIds.map((id, index) =>
      supabase.from('lead_visits').update({ visit_order: index, updated_at: new Date().toISOString() }).eq('id', id)
    )
  )
  return results.every((r) => !r.error)
}
