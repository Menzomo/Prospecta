import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { CallAnalysis } from '@/types/calls'

export async function createCallAnalysis(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string,
  costReais = 0
): Promise<CallAnalysis | null> {
  const { data, error } = await supabase
    .from('call_analyses')
    .insert({ call_id: callId, user_id: userId, status: 'pending', credits_used: costReais })
    .select()
    .single()

  if (error) {
    console.error('[callAnalysisRepository.createCallAnalysis]', error.message)
    return null
  }
  return data
}

export async function getCallAnalysisByCallId(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string
): Promise<CallAnalysis | null> {
  const { data, error } = await supabase
    .from('call_analyses')
    .select('*')
    .eq('call_id', callId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[callAnalysisRepository.getCallAnalysisByCallId]', error.message)
    return null
  }
  return data
}

export async function deleteCallAnalysisByCallId(
  supabase: SupabaseClient<Database>,
  callId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('call_analyses')
    .delete()
    .eq('call_id', callId)
    .eq('user_id', userId)

  if (error) {
    console.error('[callAnalysisRepository.deleteCallAnalysisByCallId]', error.message)
    return false
  }
  return true
}
