import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveGmailConnections } from '@/repositories/gmailRepository'
import { syncGmailForUser } from '@/services/gmailUserSyncService'
import { touchEmailSync } from '@/repositories/userSyncStatusRepository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const connections = await getActiveGmailConnections(supabase)

  let totalSynced = 0
  let totalErrors = 0

  for (const connection of connections) {
    const result = await syncGmailForUser(supabase, connection.user_id)
    totalSynced += result.synced
    totalErrors += result.errors
    await touchEmailSync(supabase, connection.user_id)
  }

  console.log('[cron/sync-replies] completed', {
    users: connections.length,
    totalSynced,
    totalErrors,
  })

  return Response.json({ ok: true, synced: totalSynced, errors: totalErrors })
}
