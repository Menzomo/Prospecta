import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Template, CreateTemplateDto, UpdateTemplateDto } from '@/types/templates'
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/repositories/templateRepository'

export type TemplateResult =
  | { success: true; template: Template }
  | { error: true }

export async function createTemplateService(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateTemplateDto
): Promise<TemplateResult> {
  const template = await createTemplate(supabase, userId, dto)
  if (!template) return { error: true }
  return { success: true, template }
}

export async function updateTemplateService(
  supabase: SupabaseClient<Database>,
  id: string,
  dto: UpdateTemplateDto
): Promise<TemplateResult> {
  const template = await updateTemplate(supabase, id, dto)
  if (!template) return { error: true }
  return { success: true, template }
}

export async function deleteTemplateService(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  return deleteTemplate(supabase, id)
}
