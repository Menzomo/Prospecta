import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Lead, CreateLeadDto, UpdateLeadDto } from '@/types/leads'

export async function getLeadsByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getLeadById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function findDuplicateLead(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | undefined | null,
  website: string | undefined | null
): Promise<'email' | 'website' | null> {
  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email)
      .maybeSingle()
    if (data) return 'email'
  }

  if (website) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .eq('website', website)
      .maybeSingle()
    if (data) return 'website'
  }

  return null
}

export async function createLead(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateLeadDto
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) {
    console.error('[leadRepository.createLead] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function updateLead(
  supabase: SupabaseClient<Database>,
  id: string,
  dto: UpdateLeadDto
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

export async function markLeadContacted(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .update({
      status: 'contatado',
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[leadRepository.markLeadContacted] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}

export async function hideLead(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .update({
      is_hidden: true,
      hidden_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return !error
}
