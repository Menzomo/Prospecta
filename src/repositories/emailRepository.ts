import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { EmailThread, EmailMessage, CreateEmailThreadDto, CreateEmailMessageDto, InboxMessage } from '@/types/email'

export async function createEmailThread(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateEmailThreadDto
): Promise<EmailThread | null> {
  const { data, error } = await supabase
    .from('email_threads')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[emailRepository.createEmailThread] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function getEmailThreadsByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<EmailThread[]> {
  const { data, error } = await supabase
    .from('email_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function createEmailMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateEmailMessageDto
): Promise<EmailMessage | null> {
  const { data, error } = await supabase
    .from('email_messages')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[emailRepository.createEmailMessage] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function getEmailMessagesByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<EmailMessage[]> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })

  if (error) return []
  return data
}

export async function getGmailMessageIdsByThreadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  threadId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('email_messages')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .eq('thread_id', threadId)

  if (error) return []
  return data.map((row) => row.gmail_message_id)
}

export async function getInboundMessagesWithLeads(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<InboxMessage[]> {
  const { data: messages, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .order('sent_at', { ascending: false })

  if (error || !messages || messages.length === 0) return []

  // Legacy leads lookup
  const leadIds = [...new Set(messages.map((m) => m.lead_id).filter((id): id is string => id !== null))]
  const { data: leads } = leadIds.length > 0
    ? await supabase.from('leads').select('id, company_name, contact_name').eq('user_id', userId).in('id', leadIds)
    : { data: [] }
  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]))

  // User leads lookup — join global_leads for company name
  // Cast via unknown: Relationships is empty in types.ts so Supabase can't infer the join
  const userLeadIds = [...new Set(messages.map((m) => m.user_lead_id).filter((id): id is string => id !== null))]
  const { data: userLeadsRaw } = userLeadIds.length > 0
    ? await supabase.from('user_leads').select('id, global_leads(company_name)').in('id', userLeadIds)
    : { data: [] }
  const userLeads = (userLeadsRaw as unknown as Array<{
    id: string
    global_leads: { company_name: string } | null
  }>) ?? []
  const userLeadMap = new Map(
    userLeads.map((ul) => [ul.id, ul.global_leads?.company_name ?? ''])
  )

  return messages.map((m) => {
    if (m.lead_id) {
      const lead = leadMap.get(m.lead_id)
      return { ...m, lead_company_name: lead?.company_name ?? '', lead_contact_name: lead?.contact_name ?? null }
    }
    return {
      ...m,
      lead_company_name: m.user_lead_id ? (userLeadMap.get(m.user_lead_id) ?? '') : '',
      lead_contact_name: null,
    }
  })
}

export async function markEmailMessageAsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
  messageId: string
): Promise<void> {
  const { error } = await supabase
    .from('email_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('[emailRepository.markEmailMessageAsRead] Supabase error:', {
      code: error.code,
      message: error.message,
    })
  }
}

export async function markInboundMessagesAsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<void> {
  const { error } = await supabase
    .from('email_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  if (error) {
    console.error('[emailRepository.markInboundMessagesAsRead] Supabase error:', {
      code: error.code,
      message: error.message,
    })
  }
}

export async function markInboundMessagesByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<void> {
  const { error } = await supabase
    .from('email_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  if (error) {
    console.error('[emailRepository.markInboundMessagesByUserLeadId] Supabase error:', {
      code: error.code,
      message: error.message,
    })
  }
}

export async function countUnreadInboundMessages(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  if (error) return 0
  return count ?? 0
}

export async function getEmailThreadsByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<EmailThread[]> {
  const { data, error } = await supabase
    .from('email_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getLeadIdsWithThreads(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('email_threads')
    .select('lead_id')
    .eq('user_id', userId)
    .not('lead_id', 'is', null)

  if (error) return []
  return [...new Set(data.map((row) => row.lead_id).filter((id): id is string => id !== null))]
}

export async function getUserLeadIdsWithThreads(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('email_threads')
    .select('user_lead_id')
    .eq('user_id', userId)
    .not('user_lead_id', 'is', null)

  if (error) return []
  return [...new Set(data.map((row) => row.user_lead_id).filter((id): id is string => id !== null))]
}

export async function updateEmailThreadLastReply(
  supabase: SupabaseClient<Database>,
  userId: string,
  threadId: string,
  lastReplyAt: string
): Promise<boolean> {
  const { error } = await supabase
    .from('email_threads')
    .update({ last_reply_at: lastReplyAt, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('user_id', userId)

  if (error) {
    console.error('[emailRepository.updateEmailThreadLastReply] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }
  return true
}
