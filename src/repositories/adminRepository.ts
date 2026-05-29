import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type AdminGlobalLeadDetail = {
  id: string
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  category_id: string | null
  status: string
  lead_quality_status: string
  confidence_score: number
  provider_source: string | null
  created_at: string
  updated_at: string
}

export type AdminGlobalLead = {
  id: string
  company_name: string
  city: string | null
  state: string | null
  email: string | null
  status: string
  lead_quality_status: string
  category_id: string | null
  confidence_score: number
  created_at: string
}

export type NichoStats = {
  category_id: string | null
  total: number
  email_found: number
  website_only: number
  manual_review: number
  invalid: number
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

export async function getGlobalLeadByIdForAdmin(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<AdminGlobalLeadDetail | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select(
      'id, company_name, email, website, phone, city, state, category_id, status, lead_quality_status, confidence_score, provider_source, created_at, updated_at'
    )
    .eq('id', id)
    .single()

  if (error) return null
  return data ?? null
}

export async function getGlobalLeadsForAdmin(
  supabase: SupabaseClient<Database>,
  filters?: { categoryId?: string; city?: string }
): Promise<AdminGlobalLead[]> {
  let query = supabase
    .from('global_leads')
    .select('id, company_name, city, state, email, status, lead_quality_status, category_id, confidence_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function getLeadStatsByCategory(
  supabase: SupabaseClient<Database>
): Promise<NichoStats[]> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('category_id, lead_quality_status')

  if (error || !data) return []

  const statsMap = new Map<string | null, NichoStats>()

  for (const row of data) {
    const key = row.category_id
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        category_id: key,
        total: 0,
        email_found: 0,
        website_only: 0,
        manual_review: 0,
        invalid: 0,
      })
    }
    const stats = statsMap.get(key)!
    stats.total++
    if (row.lead_quality_status === 'email_found') stats.email_found++
    else if (row.lead_quality_status === 'website_only') stats.website_only++
    else if (row.lead_quality_status === 'manual_review') stats.manual_review++
    else if (row.lead_quality_status === 'invalid') stats.invalid++
  }

  return Array.from(statsMap.values()).sort((a, b) => b.total - a.total)
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
