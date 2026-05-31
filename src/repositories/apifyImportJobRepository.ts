import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type ApifyImportJob = Database['public']['Tables']['apify_import_jobs']['Row']
export type CreateApifyImportJobDto = Database['public']['Tables']['apify_import_jobs']['Insert']
export type UpdateApifyImportJobDto = Database['public']['Tables']['apify_import_jobs']['Update']

export async function createApifyImportJob(
  supabase: SupabaseClient<Database>,
  dto: CreateApifyImportJobDto
): Promise<ApifyImportJob | null> {
  const { data, error } = await supabase
    .from('apify_import_jobs')
    .insert(dto)
    .select()
    .single()

  if (error) {
    console.error('[apifyImportJobRepository.create]', error.message)
    return null
  }
  return data
}

export async function getApifyImportJobById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<ApifyImportJob | null> {
  const { data, error } = await supabase
    .from('apify_import_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function listRecentApifyImportJobs(
  supabase: SupabaseClient<Database>,
  limit = 20
): Promise<ApifyImportJob[]> {
  const { data, error } = await supabase
    .from('apify_import_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}

export async function updateApifyImportJob(
  supabase: SupabaseClient<Database>,
  id: string,
  update: UpdateApifyImportJobDto
): Promise<boolean> {
  const { error } = await supabase
    .from('apify_import_jobs')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[apifyImportJobRepository.update]', error.message)
    return false
  }
  return true
}
