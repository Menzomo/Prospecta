import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleOutboundCallWebhook } from '@/services/callService'

export const dynamic = 'force-dynamic'

const XML_HEADERS = { 'Content-Type': 'text/xml' }

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params = Object.fromEntries(formData) as Record<string, string>

  const signature = request.headers.get('x-twilio-signature') ?? ''
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/calls/twiml`

  const supabase = createAdminClient()
  const result   = await handleOutboundCallWebhook(supabase, params, webhookUrl, signature)

  if (!result.ok) {
    if (result.forbidden) return new Response('Forbidden', { status: 403 })
    const twiml = `<Response><Say language="pt-BR">${result.error}</Say></Response>`
    return new Response(twiml, { status: 200, headers: XML_HEADERS })
  }

  return new Response(result.twiml, { status: 200, headers: XML_HEADERS })
}
