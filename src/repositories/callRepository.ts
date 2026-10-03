import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Call, CallWithAnalysis, CreateCallDto } from '@/types/calls'

export async function createCall(
  supabase: SupabaseClient<Database>,
  dto: CreateCallDto
): Promise<Call | null> {
  const { data, error } = await supabase
    .from('calls')
    .insert(dto)
    .select()
    .single()

  if (error) {
    console.error('[callRepository.createCall]', error.message)
    return null
  }
  return data
}

export async function getCallById(
  supabase: SupabaseClient<Database>,
  id: string,
  userId: string
): Promise<Call | null> {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[callRepository.getCallById]', error.message)
    return null
  }
  return data
}

export async function getCallsByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<Call[]> {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getCallsByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<Call[]> {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getCallsWithAnalysisByLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string
): Promise<CallWithAnalysis[]> {
  const { data, error } = await supabase
    .from('calls')
    .select('*, call_analyses(*)')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as CallWithAnalysis[]
}

export async function getCallsWithAnalysisByUserLeadId(
  supabase: SupabaseClient<Database>,
  userId: string,
  userLeadId: string
): Promise<CallWithAnalysis[]> {
  const { data, error } = await supabase
    .from('calls')
    .select('*, call_analyses(*)')
    .eq('user_id', userId)
    .eq('user_lead_id', userLeadId)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as CallWithAnalysis[]
}

export async function updateCallStatus(
  supabase: SupabaseClient<Database>,
  callSid: string,
  update: {
    status: string
    duration_seconds?: number
    ended_at?: string
    recording_sid?: string
    recording_expires_at?: string
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('calls')
    .update(update)
    .eq('call_sid', callSid)

  if (error) {
    console.error('[callRepository.updateCallStatus]', error.message)
    return false
  }
  return true
}

/**
 * Registra o resultado real do <Dial> (POST /api/calls/twiml/completed) —
 * dial_call_status vem direto do provedor (completed/no-answer/busy/failed/
 * canceled) e é o que diz se o lead atendeu de verdade, diferente do
 * CallStatus genérico do callback de gravação. Atualiza por id (o callId
 * gerado no browser, igual ao calls.id — ver createCall), não por call_sid,
 * porque é isso que o <Dial action=...> já devolve na query string.
 */
export async function updateCallDialResult(
  supabase: SupabaseClient<Database>,
  callId: string,
  update: {
    dial_call_status: string
    status?: string
    ended_at?: string
    duration_seconds?: number
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('calls')
    .update(update)
    .eq('id', callId)

  if (error) {
    console.error('[callRepository.updateCallDialResult]', error.message)
    return false
  }
  return true
}

export async function updateCallRecording(
  supabase: SupabaseClient<Database>,
  callId: string,
  storagePath: string
): Promise<boolean> {
  const { error } = await supabase
    .from('calls')
    .update({ recording_url: storagePath })
    .eq('id', callId)
    .is('recording_url', null)

  if (error) {
    console.error('[callRepository.updateCallRecording]', error.message)
    return false
  }
  return true
}

export async function updateCallNotes(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string,
  notes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('calls')
    .update({ notes })
    .eq('id', callId)
    .eq('user_id', userId)

  if (error) {
    console.error('[callRepository.updateCallNotes]', error.message)
    return false
  }
  return true
}
