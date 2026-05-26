import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { searchPlaces, getPlaceDetails } from '../integrations/googlePlacesIntegration'
import { extractEmailFromWebsite } from '../integrations/emailExtractorIntegration'
import { countLeadsSavedTodayFromSearch } from '../repositories/searchRepository'
import { getLeadCategoryByName } from '@/repositories/leadCategoryRepository'
import {
  findGlobalLeadByProviderExternalId,
  findGlobalLeadByNameAndCity,
  createGlobalLead,
} from '@/repositories/globalLeadRepository'
import { findUserLeadByGlobalLead, createUserLead } from '@/repositories/userLeadRepository'
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

  // Resolve category_id once for all global_leads created in this search
  const leadCategory = await getLeadCategoryByName(supabase, category)
  const categoryId = leadCategory?.id ?? null

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
  //    preserve place_id for use as provider_external_id
  const enriched = places
    .map((p, i) => ({ place_id: p.place_id, name: p.name, details: detailsList[i] }))
    .filter(
      (item): item is { place_id: string; name: string; details: NonNullable<typeof item.details> } =>
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
    const { place_id, details } = enriched[i]
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

    // --- Global lead: find or create ---

    // 1st: check by provider_external_id (most reliable — Google place_id is stable)
    let globalLead =
      await findGlobalLeadByProviderExternalId(supabase, 'google_maps', place_id)

    // 2nd: check by company_name + city to avoid cross-provider duplicates
    if (!globalLead) {
      globalLead = await findGlobalLeadByNameAndCity(supabase, details.name, city)
    }

    // 3rd: create if not found
    if (!globalLead) {
      globalLead = await createGlobalLead(supabase, {
        company_name: details.name,
        email,
        website: details.website,
        phone: details.phone,
        city,
        category_id: categoryId,
        provider_source: 'google_maps',
        provider_external_id: place_id,
      })
    }

    if (!globalLead) {
      console.error('[searchService] Failed to create global_lead for:', details.name)
      continue
    }

    // --- User lead: check duplicate then create ---
    const existingUserLead = await findUserLeadByGlobalLead(supabase, userId, globalLead.id)

    if (existingUserLead) {
      results.push({
        company_name: details.name,
        website: details.website!,
        email,
        phone: details.phone,
        outcome: 'duplicate',
      })
      continue
    }

    const userLead = await createUserLead(supabase, userId, {
      global_lead_id: globalLead.id,
      status: 'novo',
    })

    if (userLead) {
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
