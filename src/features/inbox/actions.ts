'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  markInboundMessagesAsRead,
  markInboundMessagesByUserLeadId,
  markEmailMessageAsRead,
} from '@/repositories/emailRepository'

function leadPath(leadId: string | null, userLeadId?: string | null): string {
  if (leadId) return `/leads/${leadId}`
  if (userLeadId) return `/leads/global/${userLeadId}`
  return '/leads'
}

export async function markLeadInboxReadAction(
  leadId: string | null,
  userLeadId?: string | null
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  if (leadId) {
    await markInboundMessagesAsRead(supabase, user.id, leadId)
  } else if (userLeadId) {
    await markInboundMessagesByUserLeadId(supabase, user.id, userLeadId)
  }

  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}

export async function markSingleReplyAsReadAction(
  messageId: string,
  leadId: string | null,
  userLeadId?: string | null
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await markEmailMessageAsRead(supabase, user.id, messageId)

  revalidatePath('/dashboard')
  revalidatePath(leadPath(leadId, userLeadId))
  revalidatePath('/inbox')
}
