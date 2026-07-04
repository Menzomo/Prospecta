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

  const args = { accessToken: connection.access_token, gmailEmail: connection.gmail_email, refreshToken: connection.refresh_token }

  const results = await Promise.allSettled([
    ...leadIds.map((leadId) => syncGmailRepliesForLead(supabase, { userId, leadId, userLeadId: null, ...args })),
    ...userLeadIds.map((userLeadId) => syncGmailRepliesForLead(supabase, { userId, leadId: null, userLeadId, ...args })),
  ])

  let totalSynced = 0
  let totalErrors = 0
  for (const r of results) {
    if (r.status === 'fulfilled') { totalSynced += r.value.synced; totalErrors += r.value.errors }
    else totalErrors++
  }

  return { synced: totalSynced, errors: totalErrors }
}
