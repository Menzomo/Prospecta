'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markInboundMessagesAsRead, markEmailMessageAsRead } from '@/repositories/emailRepository'

export async function markLeadInboxReadAction(leadId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await markInboundMessagesAsRead(supabase, user.id, leadId)

  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}

export async function markSingleReplyAsReadAction(messageId: string, leadId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await markEmailMessageAsRead(supabase, user.id, messageId)

  revalidatePath('/dashboard')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/inbox')
}
