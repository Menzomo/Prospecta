import type { Database } from '@/lib/supabase/types'

export type LeadCategory = Database['public']['Tables']['lead_categories']['Row']
export type GlobalLead = Database['public']['Tables']['global_leads']['Row']
export type UserLead = Database['public']['Tables']['user_leads']['Row']

export const GLOBAL_LEAD_STATUSES = ['active', 'hidden', 'invalid'] as const
export type GlobalLeadStatus = (typeof GLOBAL_LEAD_STATUSES)[number]

export const USER_LEAD_STATUSES = [
  'novo',
  'contatado',
  'interessado',
  'negociacao',
  'responder_depois',
  'sem_interesse',
  'sem_resposta',
] as const
export type UserLeadStatus = (typeof USER_LEAD_STATUSES)[number]

export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

export type CreateUserLeadDto = {
  global_lead_id: string
  status?: UserLeadStatus
}

export type UpdateUserLeadDto = {
  status?: UserLeadStatus
  hidden?: boolean
  notes?: string | null
  last_contacted?: string | null
}

export type CreateGlobalLeadDto = {
  company_name: string
  email?: string | null
  website?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  category_id?: string | null
  provider_source?: string | null
  provider_external_id?: string | null
}
