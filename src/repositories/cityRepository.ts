import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type CityResult = {
  name: string
  state_code: string
}

export async function searchCities(
  supabase: SupabaseClient<Database>,
  query: string
): Promise<CityResult[]> {
  if (query.length < 2) return []

  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  const { data, error } = await supabase
    .from('cities')
    .select('name, state_code')
    .or(`name.ilike.%${query}%,search_text.ilike.%${normalized}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) return []
  return data ?? []
}
