import type { Database } from '@/lib/supabase/types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type CompanyProfile = Database['public']['Tables']['company_profiles']['Row']

export type CreateCompanyProfileDto = {
  company_name: string
  description?: string
  city?: string
  phone?: string
  commercial_email?: string
  website?: string
}

export type UpdateCompanyProfileDto = Partial<CreateCompanyProfileDto>
