import type { Database } from '@/lib/supabase/types'

export type EmailThread = Database['public']['Tables']['email_threads']['Row']
export type EmailMessage = Database['public']['Tables']['email_messages']['Row']

export type CreateEmailThreadDto = {
  lead_id: string
  gmail_thread_id: string
  subject: string
}

export type CreateEmailMessageDto = {
  lead_id: string
  thread_id: string
  template_id: string | null
  subject: string
  body: string
  gmail_message_id: string
}
