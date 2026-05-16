'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createFollowupSchema, updateFollowupSchema } from '@/validations/followupSchema'
import { createFollowup, updateFollowup, updateFollowupStatus } from '@/repositories/followupRepository'

// --- Create ---

export type CreateFollowupActionState = {
  errors?: {
    title?: string[]
    notes?: string[]
    due_at?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function createFollowupAction(
  leadId: string,
  _state: CreateFollowupActionState,
  formData: FormData
): Promise<CreateFollowupActionState> {
  const validation = createFollowupSchema.safeParse({
    title: formData.get('title'),
    notes: formData.get('notes') || undefined,
    due_at: formData.get('due_at'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const followup = await createFollowup(supabase, user.id, {
    lead_id: leadId,
    title: validation.data.title,
    notes: validation.data.notes || null,
    due_at: new Date(validation.data.due_at).toISOString(),
  })

  if (!followup) {
    return { error: 'Erro ao criar acompanhamento. Tente novamente.' }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/followups')
  return { success: true }
}

// --- Update ---

export type UpdateFollowupActionState = {
  errors?: {
    title?: string[]
    notes?: string[]
    due_at?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function updateFollowupAction(
  followupId: string,
  leadId: string,
  _state: UpdateFollowupActionState,
  formData: FormData
): Promise<UpdateFollowupActionState> {
  const validation = updateFollowupSchema.safeParse({
    title: formData.get('title'),
    notes: formData.get('notes') || undefined,
    due_at: formData.get('due_at'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const followup = await updateFollowup(supabase, user.id, followupId, {
    title: validation.data.title,
    notes: validation.data.notes || null,
    due_at: new Date(validation.data.due_at).toISOString(),
  })

  if (!followup) {
    return { error: 'Erro ao atualizar acompanhamento. Tente novamente.' }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/followups')
  return { success: true }
}

// --- Complete ---

export async function completeFollowupAction(
  followupId: string,
  leadId: string,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await updateFollowupStatus(supabase, user.id, followupId, 'completed')

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/followups')
}
