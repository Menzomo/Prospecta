import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transferPendingRecordings } from '@/services/callRecordingService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const result = await transferPendingRecordings(adminSupabase)

  console.log('[cron/transfer-recordings] completed', result)

  return Response.json({ ok: true, ...result })
}
