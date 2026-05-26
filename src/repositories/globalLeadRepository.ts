import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GlobalLead, CreateGlobalLeadDto } from '@/types/globalLeads'

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
