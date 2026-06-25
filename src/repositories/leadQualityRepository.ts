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
  pending_enrichment: number
  pending_review: number
  active: number
  rejected: number
  complete: number
  email_only: number
  phone_only: number
  incomplete: number
}

export async function getManualReviewQueue(
  supabase: SupabaseClient<Database>,
  categoryId?: string
): Promise<ManualReviewLead[]> {
  let query = supabase
    .from('global_leads')
    .select('id, company_name, city, website, phone, email, lead_quality_status, category_id, created_at')
    .eq('status', 'pending_review')
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
  const [pendingEnrichment, pendingReview, active, rejected, complete, emailOnly, phoneOnly, incomplete] =
    await Promise.all([
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'pending_enrichment'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('lead_quality_status', 'complete'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('lead_quality_status', 'email_only'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('lead_quality_status', 'phone_only'),
      supabase.from('global_leads').select('*', { count: 'exact', head: true }).eq('lead_quality_status', 'incomplete'),
    ])

  return {
    pending_enrichment: pendingEnrichment.count ?? 0,
    pending_review: pendingReview.count ?? 0,
    active: active.count ?? 0,
    rejected: rejected.count ?? 0,
    complete: complete.count ?? 0,
    email_only: emailOnly.count ?? 0,
    phone_only: phoneOnly.count ?? 0,
    incomplete: incomplete.count ?? 0,
  }
}
