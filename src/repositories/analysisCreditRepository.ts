import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { AnalysisCredits } from '@/types/calls'

export async function getCurrentPeriodCredits(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AnalysisCredits | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('analysis_credits')
    .select('*')
    .eq('user_id', userId)
    .lte('period_start', now)
    .gte('period_end', now)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[analysisCreditRepository.getCurrentPeriodCredits]', error.message)
    return null
  }
  return data
}

export async function deductCredit(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString()

  // UPDATE atômico: só decrementa se ainda há créditos disponíveis no período atual
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('deduct_analysis_credit', { p_user_id: userId, p_now: now })

  if (error) {
    console.error('[analysisCreditRepository.deductCredit]', error.message)
    return false
  }
  return data === true
}

export async function initializePeriodCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  planName: string,
  creditsTotal: number
): Promise<AnalysisCredits | null> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('analysis_credits')
    .upsert(
      { user_id: userId, plan_name: planName, credits_total: creditsTotal, credits_used: 0, period_start: periodStart, period_end: periodEnd },
      { onConflict: 'user_id,period_start', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (error) {
    console.error('[analysisCreditRepository.initializePeriodCredits]', error.message)
    return null
  }
  return data
}
