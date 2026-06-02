import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type TemplateAttachment = Database['public']['Tables']['template_attachments']['Row']

export async function listAttachmentsByTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string
): Promise<TemplateAttachment[]> {
  const { data, error } = await supabase
    .from('template_attachments')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function listAttachmentsByTemplateIds(
  supabase: SupabaseClient<Database>,
  templateIds: string[]
): Promise<TemplateAttachment[]> {
  if (templateIds.length === 0) return []
  const { data, error } = await supabase
    .from('template_attachments')
    .select('*')
    .in('template_id', templateIds)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function getAttachmentById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<TemplateAttachment | null> {
  const { data, error } = await supabase
    .from('template_attachments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createAttachment(
  supabase: SupabaseClient<Database>,
  dto: Database['public']['Tables']['template_attachments']['Insert']
): Promise<TemplateAttachment | null> {
  const { data, error } = await supabase
    .from('template_attachments')
    .insert(dto)
    .select()
    .single()

  if (error) {
    console.error('[templateAttachmentRepository.create]', error.message)
    return null
  }
  return data
}

export async function deleteAttachment(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('template_attachments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[templateAttachmentRepository.delete]', error.message)
    return false
  }
  return true
}

export async function countAttachmentsByTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('template_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', templateId)

  if (error) return 0
  return count ?? 0
}
