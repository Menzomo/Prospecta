import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleStatusCallbackWebhook } from '@/services/callService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params = Object.fromEntries(formData) as Record<string, string>

  const signature  = request.headers.get('x-twilio-signature') ?? ''
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/calls/status`

  const supabase = createAdminClient()
  const result   = await handleStatusCallbackWebhook(supabase, params, webhookUrl, signature)

  if (!result.ok && result.forbidden) return new Response('Forbidden', { status: 403 })

  return Response.json({ ok: true })
}
