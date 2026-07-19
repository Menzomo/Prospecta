import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GlobalLead, CreateGlobalLeadDto } from '@/types/globalLeads'
import { computeLeadQualityStatus } from '@/types/globalLeads'
import { expandStateCode } from '@/utils/stateUtils'
import { getReleasedCities } from '@/repositories/releasedCityRepository'

export type AvailableCity = { city: string; state: string | null }

export async function getAvailableCitiesForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AvailableCity[]> {
  const { data: ownedLinks } = await supabase
    .from('user_leads')
    .select('global_lead_id')
    .eq('user_id', userId)

  const excludeIds = (ownedLinks ?? []).map((l) => l.global_lead_id)

  const releasedCities = await getReleasedCities(supabase)
  if (releasedCities.length === 0) return []

  let query = supabase
    .from('global_leads')
    .select('city, state')
    .eq('status', 'active')
    .in('lead_quality_status', ['complete', 'email_only', 'phone_only'])
    .not('city', 'is', null)
    .in('city', releasedCities.map((c) => c.city))

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) {
    console.error('[globalLeadRepository.getAvailableCitiesForUser]', error.message)
    return []
  }

  const seen = new Set<string>()
  const cities: AvailableCity[] = []
  for (const row of data ?? []) {
    if (!row.city) continue
    const key = row.city.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      cities.push({ city: row.city, state: row.state })
    }
  }
  return cities.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'))
}

export async function getGlobalLeadById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<GlobalLead | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function findGlobalLeadByProviderExternalId(
  supabase: SupabaseClient<Database>,
  providerSource: string,
  providerExternalId: string
): Promise<GlobalLead | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('*')
    .eq('provider_source', providerSource)
    .eq('provider_external_id', providerExternalId)
    .maybeSingle()

  if (error) return null
  return data
}

export async function findGlobalLeadByNameAndCity(
  supabase: SupabaseClient<Database>,
  companyName: string,
  city: string
): Promise<GlobalLead | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('*')
    .ilike('company_name', companyName)
    .ilike('city', city)
    .maybeSingle()

  if (error) return null
  return data
}

export async function findGlobalLeadByWebsite(
  supabase: SupabaseClient<Database>,
  website: string
): Promise<GlobalLead | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('*')
    .eq('website', website)
    .maybeSingle()

  if (error) return null
  return data
}

export async function createGlobalLead(
  supabase: SupabaseClient<Database>,
  dto: CreateGlobalLeadDto
): Promise<GlobalLead | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .insert(dto)
    .select()
    .single()

  if (error) {
    console.error('[globalLeadRepository.createGlobalLead] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return data
}

export async function findAvailableGlobalLeadsForUser(
  supabase: SupabaseClient<Database>,
  {
    userId,
    categoryId,
    city,
    state,
    limit,
    skipExcludeOwned = false,
  }: {
    userId: string
    categoryId: string
    city: string
    state?: string
    limit: number
    skipExcludeOwned?: boolean
  }
): Promise<GlobalLead[]> {
  let excludeIds: string[] = []

  if (!skipExcludeOwned) {
    const { data: existingLinks, error: linksError } = await supabase
      .from('user_leads')
      .select('global_lead_id')
      .eq('user_id', userId)

    if (linksError) {
      console.error('[globalLeadRepository.findAvailableGlobalLeadsForUser] Failed to fetch owned leads:', linksError.message)
    }

    excludeIds = (existingLinks ?? []).map((l) => l.global_lead_id)
  }

  // 70/30 split: complete leads take priority, partial fills the rest
  const completeLimit = Math.ceil(limit * 0.7)
  const partialLimit = limit - completeLimit

  const buildCompleteQuery = () => {
    let q = supabase
      .from('global_leads')
      .select('*')
      .eq('category_id', categoryId)
      .ilike('city', city)
      .eq('status', 'active')
      .eq('lead_quality_status', 'complete')
      .limit(completeLimit)
    if (state) q = q.ilike('state', expandStateCode(state))
    if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
    return q
  }

  const buildPartialQuery = () => {
    let q = supabase
      .from('global_leads')
      .select('*')
      .eq('category_id', categoryId)
      .ilike('city', city)
      .eq('status', 'active')
      .in('lead_quality_status', ['email_only', 'phone_only'])
      .limit(partialLimit)
    if (state) q = q.ilike('state', expandStateCode(state))
    if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
    return q
  }

  const [completeResult, partialResult] = await Promise.all([
    buildCompleteQuery(),
    buildPartialQuery(),
  ])

  if (completeResult.error) {
    console.error('[globalLeadRepository.findAvailableGlobalLeadsForUser] complete query:', completeResult.error.message)
  }
  if (partialResult.error) {
    console.error('[globalLeadRepository.findAvailableGlobalLeadsForUser] partial query:', partialResult.error.message)
  }

  const results = [...(completeResult.data ?? []), ...(partialResult.data ?? [])]

  // Belt-and-suspenders: filter in memory so owned leads never leak through
  if (!skipExcludeOwned && excludeIds.length > 0) {
    const excludeSet = new Set(excludeIds)
    return results.filter((lead) => !excludeSet.has(lead.id))
  }

  return results
}

// Approve a lead: recomputes quality from current contact fields, sets status=active
export async function approveGlobalLead(
  supabase: SupabaseClient<Database>,
  id: string,
  approvedBy: string
): Promise<boolean> {
  const { data: current } = await supabase
    .from('global_leads')
    .select('email, phone')
    .eq('id', id)
    .single()

  if (!current) return false

  const qualityStatus = computeLeadQualityStatus(current.email, current.phone)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('global_leads')
    .update({
      status: 'active',
      lead_quality_status: qualityStatus,
      approved_at: now,
      approved_by: approvedBy,
      rejection_reason: null,
      updated_at: now,
    })
    .eq('id', id)

  if (error) {
    console.error('[globalLeadRepository.approveGlobalLead]', { code: error.code, message: error.message })
    return false
  }
  return true
}

export async function rejectGlobalLead(
  supabase: SupabaseClient<Database>,
  id: string,
  reason?: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('global_leads')
    .update({
      status: 'rejected',
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[globalLeadRepository.rejectGlobalLead]', { code: error.code, message: error.message })
    return false
  }
  return true
}

// Send back to enrichment queue for n8n to retry
export async function reprocessGlobalLead(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('global_leads')
    .update({
      status: 'pending_enrichment',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[globalLeadRepository.reprocessGlobalLead]', { code: error.code, message: error.message })
    return false
  }
  return true
}

export async function updateGlobalLeadEmailAndPromote(
  supabase: SupabaseClient<Database>,
  id: string,
  email: string,
  approvedBy?: string
): Promise<boolean> {
  const { data: current } = await supabase
    .from('global_leads')
    .select('phone')
    .eq('id', id)
    .single()

  const qualityStatus = computeLeadQualityStatus(email, current?.phone ?? null)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('global_leads')
    .update({
      email,
      lead_quality_status: qualityStatus,
      status: 'active',
      approved_at: now,
      approved_by: approvedBy ?? null,
      updated_at: now,
    })
    .eq('id', id)

  if (error) {
    console.error('[globalLeadRepository.updateGlobalLeadEmailAndPromote] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}

export async function updateGlobalLeadStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: 'active' | 'pending_review' | 'pending_enrichment' | 'rejected'
): Promise<boolean> {
  const { error } = await supabase
    .from('global_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[globalLeadRepository.updateGlobalLeadStatus] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}

export async function markGlobalLeadInvalid(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  return rejectGlobalLead(supabase, id, 'dismissed_by_admin')
}
