import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { LeadCategory } from '@/types/globalLeads'

export async function listLeadCategories(
  supabase: SupabaseClient<Database>
): Promise<LeadCategory[]> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) return []
  return data
}

export async function getLeadCategoryByName(
  supabase: SupabaseClient<Database>,
  name: string
): Promise<LeadCategory | null> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('*')
    .ilike('name', name)
    .maybeSingle()

  if (error) return null
  return data
}

export async function getLeadCategoryBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<LeadCategory | null> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getLeadCategoryById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<LeadCategory | null> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
