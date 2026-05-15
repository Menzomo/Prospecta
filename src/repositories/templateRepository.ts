import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Template, CreateTemplateDto, UpdateTemplateDto } from '@/types/templates'

export async function listTemplates(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getTemplateById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createTemplate(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateTemplateDto
): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[templateRepository.createTemplate] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function updateTemplate(
  supabase: SupabaseClient<Database>,
  id: string,
  dto: UpdateTemplateDto
): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[templateRepository.updateTemplate] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function deleteTemplate(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[templateRepository.deleteTemplate] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}
