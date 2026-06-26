import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Call, CreateCallDto } from '@/types/calls'

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
