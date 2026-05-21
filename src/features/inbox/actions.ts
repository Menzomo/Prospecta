'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markInboundMessagesAsRead } from '@/repositories/emailRepository'

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
