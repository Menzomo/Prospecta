import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type ReleasedCity = {
  id: string
  city: string
  state: string | null
  released_at: string
}

export async function getReleasedCities(
  supabase: SupabaseClient<Database>
): Promise<ReleasedCity[]> {
  const { data, error } = await supabase
    .from('released_cities')
    .select('*')
    .order('city', { ascending: true })

  if (error) {
    console.error('[releasedCityRepository.getReleasedCities]', error.message)
    return []
  }
  return data
}
