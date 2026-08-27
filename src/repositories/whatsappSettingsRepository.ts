import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { WhatsAppSettings } from '@/types/whatsapp'

export async function getWhatsAppSettingsByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return null
  return data
}

/**
 * Resolve pra qual usuário um número WhatsApp pertence — usado no webhook
 * pra saber de quem é a caixa quando chega mensagem recebida (mesmo papel
 * que telnyx_numbers cumpre pra ligação).
 */
export async function getUserIdByPhoneNumber(
  adminSupabase: SupabaseClient<Database>,
  phoneNumber: string
): Promise<string | null> {
  const { data, error } = await adminSupabase
    .from('whatsapp_settings')
    .select('user_id')
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data.user_id
}
