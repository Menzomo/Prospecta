import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWhatsAppProvider } from '@/lib/whatsapp/factory'
import { getUserIdByPhoneNumber } from '@/repositories/whatsappSettingsRepository'
import { createWhatsAppMessage, updateWhatsAppMessageStatus } from '@/repositories/whatsappMessageRepository'
import { normalizeToE164 } from '@/lib/phone/normalizeToE164'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  const provider = getWhatsAppProvider()
  if (!provider.validateWebhookSignature(headers, rawBody)) {
    console.error('[whatsapp/webhook] assinatura inválida')
    return new Response('Forbidden', { status: 403 })
  }

  const event = provider.parseWebhookEvent(rawBody)
  const adminSupabase = createAdminClient()

  if (event.type === 'ignored') {
    // Formato de payload do WhatsApp na Telnyx ainda não confirmado — loga
    // o corpo bruto pra ajustar o parser assim que o primeiro webhook real
    // de um tipo não reconhecido chegar.
    console.log('[whatsapp/webhook] evento não reconhecido:', rawBody)
    return Response.json({ ok: true })
  }

  if (event.type === 'status_update') {
    await updateWhatsAppMessageStatus(adminSupabase, event.providerMessageId, event.status)
    return Response.json({ ok: true })
  }

  // inbound_message
  const userId = await getUserIdByPhoneNumber(adminSupabase, event.toNumber)
  if (!userId) {
    console.error('[whatsapp/webhook] nenhum usuário conectado pro número', event.toNumber)
    return Response.json({ ok: true })
  }

  const fromNormalized = normalizeToE164(event.fromNumber)

  const { data: matchedLead } = await adminSupabase
    .from('leads')
    .select('id')
    .eq('user_id', userId)
    .eq('phone', fromNormalized)
    .maybeSingle()

  let userLeadId: string | null = null
  if (!matchedLead) {
    const { data: matchedGlobal } = await adminSupabase
      .from('global_leads')
      .select('id, user_leads!inner(id, user_id)')
      .eq('phone', fromNormalized)
      .eq('user_leads.user_id', userId)
      .maybeSingle()
    userLeadId = (matchedGlobal?.user_leads as unknown as { id: string }[] | undefined)?.[0]?.id ?? null
  }

  await createWhatsAppMessage(adminSupabase, userId, {
    lead_id: matchedLead?.id ?? null,
    user_lead_id: userLeadId,
    direction: 'inbound',
    from_number: event.fromNumber,
    to_number: event.toNumber,
    body: event.body,
    status: 'delivered',
    provider_message_id: event.providerMessageId,
  })

  return Response.json({ ok: true })
}
