import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { WhatsAppMessage, CreateWhatsAppMessageDto, WhatsAppMessageStatus } from '@/types/whatsapp'

export async function createWhatsAppMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateWhatsAppMessageDto
): Promise<WhatsAppMessage | null> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[whatsappMessageRepository.createWhatsAppMessage]', error.message)
    return null
  }
  return data
}

export async function getWhatsAppMessagesByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function getWhatsAppMessagesByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function updateWhatsAppMessageStatus(
  adminSupabase: SupabaseClient<Database>,
  providerMessageId: string,
  status: WhatsAppMessageStatus
): Promise<boolean> {
  const { error } = await adminSupabase
    .from('whatsapp_messages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('provider_message_id', providerMessageId)

  return !error
}

/**
 * Mensagem inbound mais recente pro lead — usada pra checar a janela de 24h
 * (Meta só permite resposta grátis em texto livre dentro desse período depois
 * do último contato do lead).
 */
export async function getLastInboundMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string | null,
  userLeadId: string | null
): Promise<WhatsAppMessage | null> {
  let query = supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)

  query = leadId ? query.eq('lead_id', leadId) : query.eq('user_lead_id', userLeadId ?? '')

  const { data, error } = await query.maybeSingle()
  if (error) return null
  return data
}
