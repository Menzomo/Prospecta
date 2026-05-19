'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { disconnectGmailConnection, updateGmailTokens } from '@/repositories/gmailRepository'
import { getGmailConnectionService, refreshGmailToken } from '@/services/gmailService'
import { syncGmailRepliesForLead } from '@/services/gmailSyncService'

export async function disconnectGmailAction(_formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await disconnectGmailConnection(supabase, user.id)
  revalidatePath('/settings/gmail')
}

type SyncActionState = { synced?: number; error?: string } | null

export async function syncRepliesForLeadAction(
  leadId: string,
  _state: SyncActionState,
  _formData: FormData
): Promise<SyncActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado' }

  const connection = await getGmailConnectionService(supabase, user.id)
  if (!connection || !connection.is_connected) {
    return { error: 'Gmail não conectado' }
  }

  let accessToken = connection.access_token

  const isExpired = connection.expires_at
    ? new Date(connection.expires_at) < new Date(Date.now() + 5 * 60 * 1000)
    : false

  if (isExpired && connection.refresh_token) {
    const refreshed = await refreshGmailToken(connection.refresh_token)
    if (!refreshed) return { error: 'Falha ao renovar token do Gmail' }
    await updateGmailTokens(supabase, user.id, {
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    accessToken = refreshed.access_token
  }

  const result = await syncGmailRepliesForLead(supabase, {
    userId: user.id,
    leadId,
    accessToken,
    gmailEmail: connection.gmail_email,
  })

  revalidatePath(`/leads/${leadId}`)

  return { synced: result.synced }
}
