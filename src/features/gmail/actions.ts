'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { disconnectGmailConnection } from '@/repositories/gmailRepository'
import { getGmailConnectionService, tryRefreshGmailToken } from '@/services/gmailService'
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

  if (isExpired) {
    if (!connection.refresh_token) return { error: 'Token Gmail expirado. Reconecte o Gmail.' }
    console.log('[syncRepliesForLeadAction] token expired, attempting proactive refresh')
    const newToken = await tryRefreshGmailToken(supabase, user.id, connection.refresh_token)
    if (!newToken) return { error: 'Falha ao renovar token do Gmail. Reconecte o Gmail.' }
    console.log('[syncRepliesForLeadAction] token refreshed proactively')
    accessToken = newToken
  }

  const result = await syncGmailRepliesForLead(supabase, {
    userId: user.id,
    leadId,
    accessToken,
    gmailEmail: connection.gmail_email,
    refreshToken: connection.refresh_token,
  })

  revalidatePath(`/leads/${leadId}`)

  return { synced: result.synced }
}
