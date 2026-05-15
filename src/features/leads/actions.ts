'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createLeadSchema, updateLeadSchema } from '@/validations/leadSchema'
import { updateLead, hideLead } from '@/repositories/leadRepository'
import { createLeadWithDuplicateCheck } from '@/services/leadService'
import type { LeadStatus } from '@/types/leads'

// --- Create ---

export type CreateLeadActionState = {
  errors?: {
    company_name?: string[]
    contact_name?: string[]
    email?: string[]
    phone?: string[]
    website?: string[]
    city?: string[]
    notes?: string[]
  }
  error?: string
} | null

export async function createLeadAction(
  _state: CreateLeadActionState,
  formData: FormData
): Promise<CreateLeadActionState> {
  const validation = createLeadSchema.safeParse({
    company_name: formData.get('company_name'),
    contact_name: formData.get('contact_name') || undefined,
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    website: formData.get('website') || undefined,
    city: formData.get('city') || undefined,
    notes: formData.get('notes') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const dto = {
    company_name: validation.data.company_name,
    contact_name: validation.data.contact_name || null,
    email: validation.data.email || null,
    phone: validation.data.phone || null,
    website: validation.data.website || null,
    city: validation.data.city || null,
    notes: validation.data.notes || null,
    source: 'manual' as const,
    status: 'novo' as const,
  }

  const result = await createLeadWithDuplicateCheck(supabase, user.id, dto)

  if ('duplicate' in result) {
    return {
      errors: {
        [result.duplicate]: [`Já existe um lead com esse ${result.duplicate}.`],
      },
    }
  }

  if ('error' in result) {
    console.error('[createLeadAction] createLead failed for userId:', user.id)
    return { error: 'Erro ao criar lead. Tente novamente.' }
  }

  revalidatePath('/leads')
  redirect(`/leads/${result.lead.id}`)
}

// --- Update ---

export type UpdateLeadActionState = {
  errors?: {
    company_name?: string[]
    contact_name?: string[]
    email?: string[]
    phone?: string[]
    website?: string[]
    city?: string[]
    status?: string[]
    notes?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function updateLeadAction(
  id: string,
  _state: UpdateLeadActionState,
  formData: FormData
): Promise<UpdateLeadActionState> {
  const validation = updateLeadSchema.safeParse({
    company_name: formData.get('company_name'),
    contact_name: formData.get('contact_name') || undefined,
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    website: formData.get('website') || undefined,
    city: formData.get('city') || undefined,
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const lead = await updateLead(supabase, id, {
    company_name: validation.data.company_name,
    contact_name: validation.data.contact_name || null,
    email: validation.data.email || null,
    phone: validation.data.phone || null,
    website: validation.data.website || null,
    city: validation.data.city || null,
    status: validation.data.status as LeadStatus,
    notes: validation.data.notes || null,
  })

  if (!lead) {
    return { error: 'Erro ao atualizar lead. Tente novamente.' }
  }

  revalidatePath(`/leads/${id}`)
  revalidatePath('/leads')
  return { success: true }
}

// --- Hide ---

export async function hideLeadAction(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await hideLead(supabase, id)
  revalidatePath('/leads')
  redirect('/leads')
}
