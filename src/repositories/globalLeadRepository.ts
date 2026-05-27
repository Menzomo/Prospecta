import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GlobalLead, CreateGlobalLeadDto } from '@/types/globalLeads'
import { expandStateCode } from '@/utils/stateUtils'

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
    const { data: existingLinks } = await supabase
      .from('user_leads')
      .select('global_lead_id')
      .eq('user_id', userId)
    excludeIds = (existingLinks ?? []).map((l) => l.global_lead_id)
  }

  let query = supabase
    .from('global_leads')
    .select('*')
    .eq('category_id', categoryId)
    .ilike('city', city)
    .eq('status', 'active')
    .eq('lead_quality_status', 'email_found')
    .limit(limit)

  if (state) {
    query = query.ilike('state', expandStateCode(state))
  }

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[globalLeadRepository.findAvailableGlobalLeadsForUser]', error.message)
    return []
  }

  return data ?? []
}

export async function updateGlobalLeadStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: 'active' | 'hidden' | 'invalid'
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
