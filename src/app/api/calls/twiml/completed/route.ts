import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleDialCompletedWebhook } from '@/services/callService'

export const dynamic = 'force-dynamic'

const XML_HEADERS = { 'Content-Type': 'text/xml' }
const EMPTY_TEXML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const params  = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>
  const callId  = request.nextUrl.searchParams.get('callId')

  console.log('[twiml/completed] callId:', callId, 'DialCallStatus:', params['DialCallStatus'])

  if (!callId) {
    return new Response(EMPTY_TEXML, { status: 200, headers: XML_HEADERS })
  }

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/calls/twiml/completed?callId=${callId}`

  const supabase = createAdminClient()
  const result   = await handleDialCompletedWebhook(supabase, callId, params, webhookUrl, headers, rawBody)

  if (!result.ok && result.forbidden) return new Response('Forbidden', { status: 403 })

  // Responde com TeXML vazio — a chamada já encerrou, nada mais a fazer
  return new Response(EMPTY_TEXML, { status: 200, headers: XML_HEADERS })
}
