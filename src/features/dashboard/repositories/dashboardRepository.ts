import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type RecentReply = {
  lead_id: string
  lead_company_name: string
  last_reply_at: string
  has_unread: boolean
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
    .select('lead_id, sent_at, is_read')
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .order('sent_at', { ascending: false })
    .limit(20)

  if (error || !messages || messages.length === 0) return []

  // Group by lead: most recent reply per lead + has_unread if any message is unread
  const byLead = new Map<string, { last_reply_at: string; has_unread: boolean }>()
  for (const m of messages) {
    const existing = byLead.get(m.lead_id)
    if (!existing) {
      byLead.set(m.lead_id, { last_reply_at: m.sent_at, has_unread: !m.is_read })
    } else if (!m.is_read) {
      byLead.set(m.lead_id, { ...existing, has_unread: true })
    }
  }

  const uniqueLeadIds = Array.from(byLead.keys())

  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name')
    .eq('user_id', userId)
    .in('id', uniqueLeadIds)

  const companyMap = new Map((leads ?? []).map((l) => [l.id, l.company_name]))

  return Array.from(byLead.entries())
    .map(([lead_id, { last_reply_at, has_unread }]) => ({
      lead_id,
      lead_company_name: companyMap.get(lead_id) ?? '',
      last_reply_at,
      has_unread,
    }))
    .sort((a, b) => {
      if (a.has_unread !== b.has_unread) return a.has_unread ? -1 : 1
      return new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime()
    })
    .slice(0, 5)
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
