'use server'
import { createClient } from '@/lib/supabase/server'

export async function suggestLeadNames(query: string): Promise<string[]> {
  if (query.trim().length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const pattern = `%${query.trim()}%`

  const [{ data: userLeads }, { data: manualLeads }] = await Promise.all([
    supabase
      .from('user_leads')
      .select('global_leads!inner(company_name)')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .filter('global_leads.company_name', 'ilike', pattern)
      .limit(6),
    supabase
      .from('leads')
      .select('company_name')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .ilike('company_name', pattern)
      .limit(6),
  ])

  const names = new Set<string>()
  userLeads?.forEach((ul: any) => {
    const name = (ul.global_leads as any)?.company_name
    if (name) names.add(name as string)
  })
  manualLeads?.forEach((l: any) => {
    if (l.company_name) names.add(l.company_name as string)
  })

  return [...names].slice(0, 8)
}
