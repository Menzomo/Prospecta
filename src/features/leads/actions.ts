'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createLeadSchema, updateLeadSchema } from '@/validations/leadSchema'
import {
  createLead,
  updateLead,
  hideLead,
  findDuplicateLead,
} from '@/repositories/leadRepository'
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

  const { email, website } = validation.data
  const duplicate = await findDuplicateLead(supabase, user.id, email, website)

  if (duplicate === 'email') {
    return { errors: { email: ['Já existe um lead com esse email.'] } }
  }
  if (duplicate === 'website') {
    return { errors: { website: ['Já existe um lead com esse website.'] } }
  }

  const lead = await createLead(supabase, user.id, {
    company_name: validation.data.company_name,
    contact_name: validation.data.contact_name || null,
    email: validation.data.email || null,
    phone: validation.data.phone || null,
    website: validation.data.website || null,
    city: validation.data.city || null,
    notes: validation.data.notes || null,
    source: 'manual',
    status: 'novo',
  })

  if (!lead) {
    return { error: 'Erro ao criar lead. Tente novamente.' }
  }

  redirect(`/leads/${lead.id}`)
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
  redirect('/leads')
}
