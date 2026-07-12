import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body     = await request.json().catch(() => ({}))
  const callId   = body?.callId as string | undefined
  if (!callId) return Response.json({ ok: false, error: 'callId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('calls')
    .select('call_sid')
    .eq('id', callId)
    .maybeSingle()

  const callSid = data?.call_sid
  if (!callSid) return Response.json({ ok: true })

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return Response.json({ ok: true })

  try {
    const res = await fetch(
      `https://api.telnyx.com/v2/calls/${encodeURIComponent(callSid)}/actions/hangup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error('[calls/hangup] Telnyx API error:', res.status, text)
    }
  } catch (err) {
    console.error('[calls/hangup] fetch error:', err)
  }

  return Response.json({ ok: true })
}
