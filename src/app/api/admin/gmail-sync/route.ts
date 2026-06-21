import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveGmailConnections } from '@/repositories/gmailRepository'
import { getLeadIdsWithThreads, getUserLeadIdsWithThreads } from '@/repositories/emailRepository'
import { syncGmailRepliesForLead } from '@/services/gmailSyncService'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const connections = await getActiveGmailConnections(admin)

  let totalSynced = 0
  let totalErrors = 0

  for (const connection of connections) {
    const leadIds = await getLeadIdsWithThreads(admin, connection.user_id)

    for (const leadId of leadIds) {
      const result = await syncGmailRepliesForLead(admin, {
        userId: connection.user_id,
        leadId,
        accessToken: connection.access_token,
        gmailEmail: connection.gmail_email,
        refreshToken: connection.refresh_token,
      })
      totalSynced += result.synced
      totalErrors += result.errors
    }

    const userLeadIds = await getUserLeadIdsWithThreads(admin, connection.user_id)

    for (const userLeadId of userLeadIds) {
      const result = await syncGmailRepliesForLead(admin, {
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

  return NextResponse.json({
    ok: true,
    users: connections.length,
    synced: totalSynced,
    errors: totalErrors,
  })
}
