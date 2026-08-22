import type { Database } from '@/lib/supabase/types'

export type LeadVisit = Database['public']['Tables']['lead_visits']['Row']

export const VISIT_STATUSES = ['planejada', 'concluida', 'cancelada'] as const
export type VisitStatus = (typeof VISIT_STATUSES)[number]

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  planejada: 'Planejada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export type CreateVisitDto = {
  lead_id?: string | null
  user_lead_id?: string | null
  scheduled_date: string
  notes?: string | null
}

export type VisitWithLeadInfo = LeadVisit & {
  company_name: string
  address: string | null
  latitude: number | null
  longitude: number | null
}
