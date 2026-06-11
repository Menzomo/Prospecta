import type { Database } from '@/lib/supabase/types'

export type EmailThread = Database['public']['Tables']['email_threads']['Row']
export type EmailMessage = Database['public']['Tables']['email_messages']['Row']

export type CreateEmailThreadDto = {
  lead_id?: string | null
  user_lead_id?: string | null
  gmail_thread_id: string
  subject: string
}

export type CreateEmailMessageDto = {
  lead_id?: string | null
  user_lead_id?: string | null
  thread_id: string
  template_id: string | null
  subject: string
  body: string
  gmail_message_id: string
  direction: 'inbound' | 'outbound'
  from_email?: string | null
  sent_at?: string
}

export type InboxMessage = EmailMessage & {
  lead_company_name: string
  lead_contact_name: string | null
}
