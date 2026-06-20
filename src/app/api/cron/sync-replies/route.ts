import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveGmailConnections } from '@/repositories/gmailRepository'
import { getLeadIdsWithThreads, getUserLeadIdsWithThreads } from '@/repositories/emailRepository'
import { syncGmailRepliesForLead } from '@/services/gmailSyncService'

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
    const leadIds = await getLeadIdsWithThreads(supabase, connection.user_id)

    for (const leadId of leadIds) {
      const result = await syncGmailRepliesForLead(supabase, {
        userId: connection.user_id,
        leadId,
        accessToken: connection.access_token,
        gmailEmail: connection.gmail_email,
        refreshToken: connection.refresh_token,
      })

      totalSynced += result.synced
      totalErrors += result.errors
    }

    const userLeadIds = await getUserLeadIdsWithThreads(supabase, connection.user_id)

    for (const userLeadId of userLeadIds) {
      const result = await syncGmailRepliesForLead(supabase, {
        userId: connection.user_id,
        leadId: null,
        userLeadId,
        accessToken: connection.access_token,
        gmailEmail: connection.gmail_email,
        refreshToken: connection.refresh_token,
      })

      totalSynced += result.synced
      totalErrors += result.errors
    }
  }

  console.log('[cron/sync-replies] completed', {
    users: connections.length,
    totalSynced,
    totalErrors,
  })

  return Response.json({ ok: true, synced: totalSynced, errors: totalErrors })
}
