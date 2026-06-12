import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type ManualReviewLead = {
  id: string
  company_name: string
  city: string | null
  website: string | null
  phone: string | null
  email: string | null
  lead_quality_status: string
  category_id: string | null
  created_at: string
}

export type LeadQualityOverview = {
  email_found: number
  website_only: number
  manual_review: number
  invalid: number
}

export async function getManualReviewQueue(
  supabase: SupabaseClient<Database>,
  categoryId?: string
): Promise<ManualReviewLead[]> {
  let query = supabase
    .from('global_leads')
    .select('id, company_name, city, website, phone, email, lead_quality_status, category_id, created_at')
    .in('lead_quality_status', ['manual_review', 'website_only'])
    .order('created_at', { ascending: false })
    .limit(200)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) return []
  return data ?? []
}

export async function getLeadQualityOverview(
  supabase: SupabaseClient<Database>
): Promise<LeadQualityOverview> {
  const [emailFound, websiteOnly, manualReview, invalid] = await Promise.all([
    supabase
      .from('global_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_quality_status', 'email_found'),
    supabase
      .from('global_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_quality_status', 'website_only'),
    supabase
      .from('global_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_quality_status', 'manual_review'),
    supabase
      .from('global_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_quality_status', 'invalid'),
  ])

  return {
    email_found: emailFound.count ?? 0,
    website_only: websiteOnly.count ?? 0,
    manual_review: manualReview.count ?? 0,
    invalid: invalid.count ?? 0,
  }
}
