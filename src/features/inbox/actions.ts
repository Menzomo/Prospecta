'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markInboundMessagesAsRead } from '@/repositories/emailRepository'

export async function markLeadInboxReadAction(leadId: string): Promise<void> {
  console.log('[markLeadInboxReadAction] called', { leadId })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[markLeadInboxReadAction] no user found — aborting')
    return
  }

  console.log('[markLeadInboxReadAction] user found', { userId: user.id })

  await markInboundMessagesAsRead(supabase, user.id, leadId)

  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}
