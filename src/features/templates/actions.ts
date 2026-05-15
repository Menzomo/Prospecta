'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTemplateSchema, updateTemplateSchema } from '@/validations/templateSchema'
import {
  createTemplateService,
  updateTemplateService,
  deleteTemplateService,
} from '@/services/templateService'

// --- Create ---

export type CreateTemplateActionState = {
  errors?: {
    name?: string[]
    subject?: string[]
    body?: string[]
  }
  error?: string
} | null

export async function createTemplateAction(
  _state: CreateTemplateActionState,
  formData: FormData
): Promise<CreateTemplateActionState> {
  const validation = createTemplateSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const result = await createTemplateService(supabase, user.id, validation.data)

  if ('error' in result) {
    console.error('[createTemplateAction] failed for userId:', user.id)
    return { error: 'Erro ao criar template. Tente novamente.' }
  }

  revalidatePath('/templates')
  redirect(`/templates/${result.template.id}`)
}

// --- Update ---

export type UpdateTemplateActionState = {
  errors?: {
    name?: string[]
    subject?: string[]
    body?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function updateTemplateAction(
  id: string,
  _state: UpdateTemplateActionState,
  formData: FormData
): Promise<UpdateTemplateActionState> {
  const validation = updateTemplateSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const result = await updateTemplateService(supabase, id, validation.data)

  if ('error' in result) {
    console.error('[updateTemplateAction] failed for id:', id)
    return { error: 'Erro ao atualizar template. Tente novamente.' }
  }

  revalidatePath(`/templates/${id}`)
  revalidatePath('/templates')
  return { success: true }
}

// --- Delete ---

export async function deleteTemplateAction(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await deleteTemplateService(supabase, id)
  revalidatePath('/templates')
  redirect('/templates')
}
