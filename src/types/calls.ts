import type { Database } from '@/lib/supabase/types'

export type TelephonySettings = Database['public']['Tables']['telephony_settings']['Row']
export type Call = Database['public']['Tables']['calls']['Row']
export type CallAnalysis = Database['public']['Tables']['call_analyses']['Row']
export type AnalysisCredits = Database['public']['Tables']['analysis_credits']['Row']

export const CALL_STATUSES = [
  'initiated',
  'ringing',
  'in-progress',
  'completed',
  'failed',
  'no-answer',
  'busy',
  'canceled',
] as const
export type CallStatus = (typeof CALL_STATUSES)[number]

export const CALL_ANALYSIS_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
export type CallAnalysisStatus = (typeof CALL_ANALYSIS_STATUSES)[number]

export type UpsertTelephonySettingsDto = {
  account_sid: string
  auth_token_encrypted: string
  api_key_sid: string | null
  api_key_secret_encrypted: string | null
  phone_number: string
  twiml_app_sid: string | null
}

export type CreateCallDto = {
  id?: string           // UUID gerado pelo browser para correlação imediata
  user_id: string
  lead_id: string | null
  user_lead_id: string | null
  call_sid: string
  to_number: string
  from_number: string
  direction?: 'outbound' | 'inbound'   // default 'outbound' (mesmo default da coluna)
}

export type CallWithAnalysis = Call & {
  // Supabase retorna objeto único (não array) quando há UNIQUE constraint em call_id,
  // ou null quando não há análise. Normalize sempre com Array.isArray antes de usar.
  call_analyses: CallAnalysis | CallAnalysis[] | null
}
