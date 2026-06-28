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

export const FOLLOWUP_TYPES = ['manual', 'no_reply'] as const
export type FollowupType = (typeof FOLLOWUP_TYPES)[number]

export type CreateFollowupDto = {
  lead_id?: string | null
  user_lead_id?: string | null
  title: string
  notes: string | null
  due_at: string
  type?: string
  email_message_id?: string | null
}

export type UpdateFollowupDto = {
  title: string
  notes: string | null
  due_at: string
}

export type FollowupWithLead = Followup & {
  leads: { company_name: string; last_reply_at: string | null; status: string | null } | null
  user_leads: { global_leads: { company_name: string } | null } | null
}
