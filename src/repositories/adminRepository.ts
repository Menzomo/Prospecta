import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type AdminGlobalLead = {
  id: string
  company_name: string
  city: string | null
  state: string | null
  email: string | null
  status: string
  confidence_score: number
  created_at: string
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  search_terms: string[]
}

export type AdminUser = {
  id: string
  email: string
  role: string
  created_at: string
}

export async function getGlobalLeadsForAdmin(
  supabase: SupabaseClient<Database>
): Promise<AdminGlobalLead[]> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('id, company_name, city, state, email, status, confidence_score, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data ?? []
}

export async function getCategoriesForAdmin(
  supabase: SupabaseClient<Database>
): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('id, name, slug, search_terms')
    .order('name', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function getUsersForAdmin(
  supabase: SupabaseClient<Database>
): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data ?? []
}
