import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type RecentReply = {
  id: string
  lead_id: string
  lead_company_name: string
  subject: string
  from_email: string | null
  sent_at: string
}

export type NextFollowup = {
  id: string
  lead_id: string
  company_name: string
  title: string
  due_at: string
}

export async function getTotalLeads(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_hidden', false)

  if (error) return 0
  return count ?? 0
}

export async function getSentEmailsCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('direction', 'outbound')

  if (error) return 0
  return count ?? 0
}

export async function getReceivedRepliesCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('direction', 'inbound')

  if (error) return 0
  return count ?? 0
}

export async function getPendingFollowupsCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('followups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) return 0
  return count ?? 0
}

export async function getInterestedLeadsCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'interessado')
    .eq('is_hidden', false)

  if (error) return 0
  return count ?? 0
}

export async function getRecentReplies(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RecentReply[]> {
  const { data: messages, error } = await supabase
    .from('email_messages')
    .select('id, lead_id, subject, from_email, sent_at')
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .order('sent_at', { ascending: false })
    .limit(3)

  if (error || !messages || messages.length === 0) return []

  const leadIds = messages.map((m) => m.lead_id)

  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name')
    .eq('user_id', userId)
    .in('id', leadIds)

  const leadMap = new Map((leads ?? []).map((l) => [l.id, l.company_name]))

  return messages.map((m) => ({
    id: m.id,
    lead_id: m.lead_id,
    lead_company_name: leadMap.get(m.lead_id) ?? '',
    subject: m.subject,
    from_email: m.from_email,
    sent_at: m.sent_at,
  }))
}

export async function getNextFollowups(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NextFollowup[]> {
  const { data, error } = await supabase
    .from('followups')
    .select('id, lead_id, title, due_at, leads(company_name)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_at', { ascending: true })
    .limit(3)

  if (error || !data) return []

  // Cast necessário: Relationships vazio em types.ts impede inferência do join
  const rows = data as unknown as Array<{
    id: string
    lead_id: string
    title: string
    due_at: string
    leads: { company_name: string } | null
  }>

  return rows.map((r) => ({
    id: r.id,
    lead_id: r.lead_id,
    title: r.title,
    due_at: r.due_at,
    company_name: r.leads?.company_name ?? '',
  }))
}
