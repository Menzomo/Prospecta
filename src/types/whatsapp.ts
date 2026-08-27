import type { Database } from '@/lib/supabase/types'

export type WhatsAppSettings = Database['public']['Tables']['whatsapp_settings']['Row']
export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row']

export const WHATSAPP_MESSAGE_STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'] as const
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number]

export type CreateWhatsAppMessageDto = {
  lead_id?: string | null
  user_lead_id?: string | null
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  body: string
  status?: WhatsAppMessageStatus
  provider_message_id?: string | null
}
