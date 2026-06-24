import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { SyncResult } from './gmailSyncService'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { getLeadIdsWithThreads, getUserLeadIdsWithThreads } from '@/repositories/emailRepository'
import { syncGmailRepliesForLead } from './gmailSyncService'

export async function syncGmailForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SyncResult> {
  const connection = await getGmailConnection(supabase, userId)

  if (!connection?.is_connected) {
    return { synced: 0, errors: 0 }
  }

  const [leadIds, userLeadIds] = await Promise.all([
    getLeadIdsWithThreads(supabase, userId),
    getUserLeadIdsWithThreads(supabase, userId),
  ])

  let totalSynced = 0
  let totalErrors = 0

  for (const leadId of leadIds) {
    const result = await syncGmailRepliesForLead(supabase, {
      userId,
      leadId,
      accessToken: connection.access_token,
      gmailEmail: connection.gmail_email,
      refreshToken: connection.refresh_token,
    })
    totalSynced += result.synced
    totalErrors += result.errors
  }

  for (const userLeadId of userLeadIds) {
    const result = await syncGmailRepliesForLead(supabase, {
      userId,
      leadId: null,
      userLeadId,
      accessToken: connection.access_token,
      gmailEmail: connection.gmail_email,
      refreshToken: connection.refresh_token,
    })
    totalSynced += result.synced
    totalErrors += result.errors
  }

  return { synced: totalSynced, errors: totalErrors }
}
