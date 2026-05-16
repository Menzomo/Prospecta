'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { disconnectGmailConnection } from '@/repositories/gmailRepository'

export async function disconnectGmailAction(_formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await disconnectGmailConnection(supabase, user.id)
  revalidatePath('/settings/gmail')
}
