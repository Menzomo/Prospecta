import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleStatusCallbackWebhook } from '@/services/callService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const params  = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>

  console.log('[status] params:', JSON.stringify({
    CallSid: params['CallSid'],
    CallStatus: params['CallStatus'],
    CallDuration: params['CallDuration'],
    RecordingStatus: params['RecordingStatus'],
    RecordingSid: params['RecordingSid'],
    RecordingUrl: params['RecordingUrl'] ? '<present>' : undefined,
    ConnectionId: params['ConnectionId'] ?? '(ausente)',
    userId: params['SipHeader_X-ProspectaUserId'] ?? '(ausente)',
    allKeys: Object.keys(params).join(','),
  }))

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/calls/status`

  const supabase = createAdminClient()
  const result   = await handleStatusCallbackWebhook(supabase, params, webhookUrl, headers, rawBody)

  if (!result.ok && result.forbidden) return new Response('Forbidden', { status: 403 })

  return Response.json({ ok: true })
}
