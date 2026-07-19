import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { LeadCategory } from '@/types/globalLeads'

export async function listCategoriesWithAvailableLeadsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<LeadCategory[]> {
  const { data: ownedLinks } = await supabase
    .from('user_leads')
    .select('global_lead_id')
    .eq('user_id', userId)

  const ownedIds = (ownedLinks ?? []).map((l) => l.global_lead_id)

  let availableQuery = supabase
    .from('global_leads')
    .select('category_id')
    .eq('status', 'active')
    .in('lead_quality_status', ['complete', 'email_only', 'phone_only'])

  if (ownedIds.length > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${ownedIds.join(',')})`)
  }

  const { data: availableLeads } = await availableQuery

  const categoryIds = [
    ...new Set(
      (availableLeads ?? []).map((l) => l.category_id).filter((id): id is string => id !== null)
    ),
  ]

  if (categoryIds.length === 0) return []

  const { data: categories, error } = await supabase
    .from('lead_categories')
    .select('*')
    .in('id', categoryIds)
    .order('name', { ascending: true })

  if (error) return []
  return categories
}

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
