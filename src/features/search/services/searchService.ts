import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { findDuplicateLead, createLead } from '@/repositories/leadRepository'
import { searchPlaces, getPlaceDetails } from '../integrations/googlePlacesIntegration'
import { extractEmailFromWebsite } from '../integrations/emailExtractorIntegration'
import { countLeadsSavedTodayFromSearch } from '../repositories/searchRepository'
import type { SearchResultItem, SearchApiResponse } from '../types'

const DAILY_LIMIT = 5

export async function executeLeadSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  category: string,
  city: string
): Promise<SearchApiResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY não configurada')
  }

  // Check daily limit
  const savedToday = await countLeadsSavedTodayFromSearch(supabase, userId)
  const remaining = DAILY_LIMIT - savedToday

  if (remaining <= 0) {
    return { results: [], saved: 0, daily_remaining: 0 }
  }

  // 1. Text Search — find places
  const places = await searchPlaces(category, city, apiKey)
  if (places.length === 0) {
    return { results: [], saved: 0, daily_remaining: remaining }
  }

  // 2. Place Details — get website + phone for all results in parallel
  const detailsList = await Promise.all(
    places.map((p) => getPlaceDetails(p.place_id, apiKey))
  )

  // 3. Build enriched list, keep only places with a website
  const enriched = places
    .map((p, i) => ({ name: p.name, details: detailsList[i] }))
    .filter((item): item is { name: string; details: NonNullable<typeof item.details> } =>
      item.details !== null && item.details.website !== null
    )

  if (enriched.length === 0) {
    return { results: [], saved: 0, daily_remaining: remaining }
  }

  // 4. Extract emails from all websites in parallel
  const emails = await Promise.all(
    enriched.map((item) => extractEmailFromWebsite(item.details.website!))
  )

  // 5. Persist leads — sequential to respect daily limit
  const results: SearchResultItem[] = []
  let savedCount = 0

  for (let i = 0; i < enriched.length; i++) {
    const { details } = enriched[i]
    const email = emails[i]

    if (!email) {
      results.push({
        company_name: details.name,
        website: details.website!,
        email: '',
        phone: details.phone,
        outcome: 'no_email',
      })
      continue
    }

    if (savedCount >= remaining) {
      results.push({
        company_name: details.name,
        website: details.website!,
        email,
        phone: details.phone,
        outcome: 'limit_reached',
      })
      continue
    }

    // Deduplication — catches both active and hidden leads
    const duplicate = await findDuplicateLead(supabase, userId, email, details.website)
    if (duplicate) {
      results.push({
        company_name: details.name,
        website: details.website!,
        email,
        phone: details.phone,
        outcome: 'duplicate',
      })
      continue
    }

    const saved = await createLead(supabase, userId, {
      company_name: details.name,
      email,
      website: details.website,
      phone: details.phone,
      city,
      source: 'google_maps',
      status: 'novo',
    })

    if (saved) {
      savedCount++
      results.push({
        company_name: details.name,
        website: details.website!,
        email,
        phone: details.phone,
        outcome: 'saved',
      })
    }
  }

  return {
    results,
    saved: savedCount,
    daily_remaining: remaining - savedCount,
  }
}
