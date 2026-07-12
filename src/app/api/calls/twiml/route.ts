import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleOutboundCallWebhook } from '@/services/callService'

export const dynamic = 'force-dynamic'

const XML_HEADERS = { 'Content-Type': 'text/xml' }

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const params  = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  // DEBUG — remover após confirmar flow Telnyx em produção
  console.log('[twiml] params recebidos:', JSON.stringify(params))
  console.log('[twiml] headers relevantes:', JSON.stringify({
    'content-type': headers['content-type'],
    'telnyx-signature-ed25519-signature': headers['telnyx-signature-ed25519-signature'] ? '<present>' : '<absent>',
    'x-twilio-signature': headers['x-twilio-signature'] ? '<present>' : '<absent>',
  }))

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/calls/twiml`

  const supabase = createAdminClient()
  const result   = await handleOutboundCallWebhook(supabase, params, webhookUrl, headers, rawBody)

  if (!result.ok) {
    if (result.forbidden) return new Response('Forbidden', { status: 403 })
    console.error('[twiml] erro:', result.error)
    const twiml = `<Response><Say language="pt-BR">${result.error}</Say></Response>`
    return new Response(twiml, { status: 200, headers: XML_HEADERS })
  }

  console.log('[twiml] TeXML gerado:', result.twiml)
  return new Response(result.twiml, { status: 200, headers: XML_HEADERS })
}
