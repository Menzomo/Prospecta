import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type LeadNote = {
  id: string
  user_id: string
  lead_id: string | null
  user_lead_id: string | null
  content: string
  created_at: string
}

export type LeadNoteTarget = { leadId: string } | { userLeadId: string }

export async function listLeadNotes(
  supabase: SupabaseClient<Database>,
  target: LeadNoteTarget
): Promise<LeadNote[]> {
  const query = supabase.from('lead_notes').select('*').order('created_at', { ascending: false })
  const { data, error } = 'leadId' in target
    ? await query.eq('lead_id', target.leadId)
    : await query.eq('user_lead_id', target.userLeadId)

  if (error) {
    console.error('[leadNotesRepository.listLeadNotes]', error.message)
    return []
  }
  return data ?? []
}

export async function createLeadNote(
  supabase: SupabaseClient<Database>,
  userId: string,
  target: LeadNoteTarget,
  content: string
): Promise<boolean> {
  const { error } = await supabase.from('lead_notes').insert({
    user_id: userId,
    lead_id: 'leadId' in target ? target.leadId : null,
    user_lead_id: 'userLeadId' in target ? target.userLeadId : null,
    content,
  })

  if (error) {
    console.error('[leadNotesRepository.createLeadNote]', error.message)
    return false
  }
  return true
}
