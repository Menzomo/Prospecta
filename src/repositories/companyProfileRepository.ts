import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { CompanyProfile, CreateCompanyProfileDto } from '@/types/auth'

export async function getCompanyProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CompanyProfile | null> {
  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export async function createCompanyProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateCompanyProfileDto
): Promise<CompanyProfile | null> {
  const { data, error } = await supabase
    .from('company_profiles')
    .insert({ user_id: userId, ...dto })
    .select()
    .single()

  if (error) return null
  return data
}

export async function updateCompanyProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: Partial<CreateCompanyProfileDto>
): Promise<CompanyProfile | null> {
  const { data, error } = await supabase
    .from('company_profiles')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return null
  return data
}
