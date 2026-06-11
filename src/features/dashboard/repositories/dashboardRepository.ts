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
  type: string
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
    .select('lead_id, sent_at')
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .eq('is_read', false)
    .order('sent_at', { ascending: false })
    .limit(20)

  if (error || !messages || messages.length === 0) return []

  // Deduplicate by lead: most recent unread message per lead (skip messages without a lead_id)
  const byLead = new Map<string, string>()
  for (const m of messages) {
    if (!m.lead_id) continue
    if (!byLead.has(m.lead_id)) {
      byLead.set(m.lead_id, m.sent_at)
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
    .map(([lead_id, last_reply_at]) => ({
      lead_id,
      lead_company_name: companyMap.get(lead_id) ?? '',
      last_reply_at,
      has_unread: true,
    }))
    .sort((a, b) => new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime())
    .slice(0, 5)
}

export async function getNextFollowups(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NextFollowup[]> {
  // created_at desc: mais recente primeiro. Limite 20 para absorver filtragem de no_reply.
  const { data, error } = await supabase
    .from('followups')
    .select('id, lead_id, title, due_at, type, created_at, leads(company_name, last_reply_at)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []

  // Cast necessário: Relationships vazio em types.ts impede inferência do join
  const rows = data as unknown as Array<{
    id: string
    lead_id: string
    title: string
    due_at: string
    type: string
    created_at: string
    leads: { company_name: string; last_reply_at: string | null } | null
  }>

  return rows
    .filter((r) => {
      if (r.type !== 'no_reply') return true
      const lastReplyAt = r.leads?.last_reply_at
      if (!lastReplyAt) return true
      // Ocultar se o lead respondeu após a criação do acompanhamento
      return new Date(lastReplyAt) <= new Date(r.created_at)
    })
    .map((r) => ({
      id: r.id,
      lead_id: r.lead_id,
      title: r.title,
      due_at: r.due_at,
      type: r.type,
      company_name: r.leads?.company_name ?? '',
    }))
}
