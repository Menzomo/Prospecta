import type { Database } from '@/lib/supabase/types'

export type Followup = Database['public']['Tables']['followups']['Row']

export const FOLLOWUP_STATUSES = ['pending', 'completed', 'ignored', 'cancelled'] as const
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number]

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  pending: 'Pendente',
  completed: 'Concluído',
  ignored: 'Ignorado',
  cancelled: 'Cancelado',
}

export type CreateFollowupDto = {
  lead_id: string
  title: string
  notes: string | null
  due_at: string
}

export type UpdateFollowupDto = {
  title: string
  notes: string | null
  due_at: string
}

export type FollowupWithLead = Followup & {
  leads: { company_name: string } | null
}
