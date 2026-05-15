import type { Database } from '@/lib/supabase/types'

export type Lead = Database['public']['Tables']['leads']['Row']

export const LEAD_STATUSES = [
  'novo',
  'contatado',
  'interessado',
  'negociacao',
  'responder_depois',
  'sem_interesse',
  'sem_resposta',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  interessado: 'Interessado',
  negociacao: 'Negociação',
  responder_depois: 'Responder depois',
  sem_interesse: 'Sem interesse',
  sem_resposta: 'Sem resposta',
}

export type CreateLeadDto = {
  company_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  city?: string | null
  source: string
  status: LeadStatus
  notes?: string | null
}

export type UpdateLeadDto = {
  company_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  city?: string | null
  status: LeadStatus
  notes?: string | null
}
