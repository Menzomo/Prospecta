import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { EmailThread, EmailMessage, CreateEmailThreadDto, CreateEmailMessageDto } from '@/types/email'

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
    .insert({ user_id: userId, direction: 'outbound', ...dto })
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
