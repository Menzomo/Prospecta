'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLeadById } from '@/repositories/leadRepository'
import { getWhatsAppSettingsByUserId } from '@/repositories/whatsappSettingsRepository'
import { createWhatsAppMessage, getLastInboundMessage } from '@/repositories/whatsappMessageRepository'
import { getWhatsAppProvider } from '@/lib/whatsapp/factory'
import { normalizeToE164 } from '@/lib/phone/normalizeToE164'

const WINDOW_MS = 24 * 60 * 60 * 1000

export type SendWhatsAppState = { error?: string; success?: boolean } | null

export async function sendWhatsAppMessageAction(
  leadId: string | null,
  userLeadId: string | null,
  _state: SendWhatsAppState,
  formData: FormData
): Promise<SendWhatsAppState> {
  const body = (formData.get('body') as string | null)?.trim()
  if (!body) return { error: 'Escreva uma mensagem.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const settings = await getWhatsAppSettingsByUserId(supabase, user.id)
  if (!settings) return { error: 'WhatsApp não conectado pra esse usuário.' }

  let leadPhone: string | null = null

  if (leadId) {
    const lead = await getLeadById(supabase, leadId)
    if (!lead || lead.user_id !== user.id) return { error: 'Lead não encontrado.' }
    leadPhone = lead.phone
  } else if (userLeadId) {
    const { data, error } = await supabase
      .from('user_leads')
      .select('id, global_leads(phone)')
      .eq('id', userLeadId)
      .eq('user_id', user.id)
      .single()
    if (error || !data) return { error: 'Lead não encontrado.' }
    leadPhone = (data.global_leads as unknown as { phone: string | null } | null)?.phone ?? null
  } else {
    return { error: 'Nenhum lead informado.' }
  }

  if (!leadPhone) return { error: 'Esse lead não tem telefone cadastrado.' }

  const lastInbound = await getLastInboundMessage(supabase, user.id, leadId, userLeadId)
  const withinWindow = lastInbound && Date.now() - new Date(lastInbound.created_at).getTime() < WINDOW_MS
  if (!withinWindow) {
    return {
      error: 'Fora da janela de resposta de 24h — pra iniciar contato é preciso um template aprovado pela Meta, ainda não disponível nesta versão.',
    }
  }

  const to = normalizeToE164(leadPhone, 'BR')
  const provider = getWhatsAppProvider()

  let sent
  try {
    sent = await provider.sendTextMessage(settings.phone_number, to, body)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao enviar mensagem.' }
  }

  await createWhatsAppMessage(supabase, user.id, {
    lead_id: leadId,
    user_lead_id: userLeadId,
    direction: 'outbound',
    from_number: settings.phone_number,
    to_number: to,
    body,
    status: 'sent',
    provider_message_id: sent.providerMessageId,
  })

  if (leadId) revalidatePath(`/leads/${leadId}`)
  if (userLeadId) revalidatePath(`/leads/global/${userLeadId}`)

  return { success: true }
}
