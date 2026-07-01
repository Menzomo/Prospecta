import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transferPendingRecordings, expireOldRecordings } from '@/services/callRecordingService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const adminSupabase = createAdminClient()

  const transfer = await transferPendingRecordings(adminSupabase)
  const expire = await expireOldRecordings(adminSupabase)

  console.log('[cron/process-recordings] completed', { transfer, expire })

  return Response.json({ ok: true, transfer, expire })
}
