'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createFollowupSchema, updateFollowupSchema } from '@/validations/followupSchema'
import { createFollowup, updateFollowup, updateFollowupStatus } from '@/repositories/followupRepository'
import { updateLeadStatus } from '@/repositories/leadRepository'
import { updateUserLead } from '@/repositories/userLeadRepository'

function leadPath(leadId: string | null, userLeadId: string | null): string {
  if (leadId) return `/leads/${leadId}`
  if (userLeadId) return `/leads/global/${userLeadId}`
  return '/leads'
}

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
  leadId: string | null,
  userLeadId: string | null,
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
    lead_id: leadId ?? null,
    user_lead_id: userLeadId ?? null,
    title: validation.data.title,
    notes: validation.data.notes || null,
    due_at: validation.data.due_at,
  })

  if (!followup) {
    return { error: 'Erro ao criar acompanhamento. Tente novamente.' }
  }

  revalidatePath(leadPath(leadId, userLeadId))
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
  leadId: string | null,
  userLeadId: string | null,
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
    due_at: validation.data.due_at,
  })

  if (!followup) {
    return { error: 'Erro ao atualizar acompanhamento. Tente novamente.' }
  }

  revalidatePath(leadPath(leadId, userLeadId))
  revalidatePath('/followups')
  return { success: true }
}

// --- Create no-reply (post-send) ---

type CreateNoReplyResult = { success?: boolean; error?: string }

export async function createNoReplyFollowupAction(
  leadId: string | null,
  userLeadId: string | null,
  emailMessageId: string,
  dueAt: string
): Promise<CreateNoReplyResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Sessão expirada.' }

  const followup = await createFollowup(supabase, user.id, {
    lead_id: leadId ?? null,
    user_lead_id: userLeadId ?? null,
    title: 'Verificar resposta ao email enviado',
    notes: null,
    due_at: dueAt,
    type: 'no_reply',
    email_message_id: emailMessageId,
  })

  if (!followup) return { error: 'Erro ao criar acompanhamento. Tente novamente.' }

  revalidatePath(leadPath(leadId, userLeadId))
  revalidatePath('/followups')
  revalidatePath('/dashboard')
  return { success: true }
}

// --- Dismiss no-reply ("Esquecer lead") ---

export async function dismissNoReplyFollowupAction(
  followupId: string,
  leadId: string | null,
  userLeadId: string | null,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await updateFollowupStatus(supabase, user.id, followupId, 'cancelled')

  // "Esquecer lead" is an explicit user decision to abandon the lead.
  // Always set sem_resposta regardless of current status.
  if (leadId) {
    await updateLeadStatus(supabase, user.id, leadId, 'sem_resposta')
  } else if (userLeadId) {
    const { data: ownedLead } = await supabase.from('user_leads').select('id').eq('id', userLeadId).eq('user_id', user.id).single()
    if (ownedLead) await updateUserLead(supabase, userLeadId, { status: 'sem_resposta' })
  }

  revalidatePath('/dashboard')
  revalidatePath(leadPath(leadId, userLeadId))
  revalidatePath('/followups')
}

// --- Complete ---

export async function completeFollowupAction(
  followupId: string,
  leadId: string | null,
  userLeadId: string | null,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await updateFollowupStatus(supabase, user.id, followupId, 'completed')

  revalidatePath(leadPath(leadId, userLeadId))
  revalidatePath('/followups')
}

// --- Send new email from no_reply ("Enviar novo email") ---
// Marks the no_reply followup as completed before redirecting to the send page.
// The click signals the user is actively following up, so the followup is done.

export async function sendNewEmailFromNoReplyAction(
  followupId: string,
  leadId: string | null,
  userLeadId: string | null,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await updateFollowupStatus(supabase, user.id, followupId, 'completed')

  revalidatePath('/dashboard')
  revalidatePath('/followups')
  revalidatePath(leadPath(leadId, userLeadId))

  const sendPath = leadId ? `/leads/${leadId}/send` : `/leads/global/${userLeadId}/send`
  redirect(sendPath)
}
