import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getSearchProvider } from '../providers/getSearchProvider'
import { countLeadsSavedTodayFromSearch } from '../repositories/searchRepository'
import { getLeadCategoryByName } from '@/repositories/leadCategoryRepository'
import {
  findGlobalLeadByProviderExternalId,
  findGlobalLeadByNameAndCity,
  createGlobalLead,
} from '@/repositories/globalLeadRepository'
import { findUserLeadByGlobalLead, createUserLead } from '@/repositories/userLeadRepository'
import type { SearchResultItem, SearchApiResponse } from '../types'
import { classifyLeadQuality } from '@/utils/classifyLeadQuality'

const DAILY_LIMIT = 5

export async function executeLeadSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  category: string,
  city: string,
  state?: string
): Promise<SearchApiResponse> {
  // Check daily limit
  const savedToday = await countLeadsSavedTodayFromSearch(supabase, userId)
  const remaining = DAILY_LIMIT - savedToday

  if (remaining <= 0) {
    return { results: [], saved: 0, daily_remaining: 0 }
  }

  // Resolve category_id once for all global_leads created in this search
  const leadCategory = await getLeadCategoryByName(supabase, category)
  const categoryId = leadCategory?.id ?? null

  // Delegate IO-heavy work to the configured provider
  const provider = getSearchProvider()
  const providerResults = await provider.search({ category, city, state, limit: 15 })

  if (providerResults.length === 0) {
    return { results: [], saved: 0, daily_remaining: remaining }
  }

  // Persist leads — sequential to respect daily limit
  const results: SearchResultItem[] = []
  let savedCount = 0

  for (const result of providerResults) {
    if (!result.email) {
      results.push({
        company_name: result.company_name,
        website: result.website,
        email: '',
        phone: result.phone,
        outcome: 'no_email',
      })
      continue
    }

    if (savedCount >= remaining) {
      results.push({
        company_name: result.company_name,
        website: result.website,
        email: result.email,
        phone: result.phone,
        outcome: 'limit_reached',
      })
      continue
    }

    const email = result.email

    // --- Global lead: find or create ---

    // 1st: check by provider_external_id (most reliable — Google place_id is stable)
    let globalLead = result.provider_external_id
      ? await findGlobalLeadByProviderExternalId(
          supabase,
          result.provider_source,
          result.provider_external_id
        )
      : null

    // 2nd: check by company_name + city to avoid cross-provider duplicates
    if (!globalLead) {
      globalLead = await findGlobalLeadByNameAndCity(supabase, result.company_name, result.city)
    }

    // 3rd: create if not found
    if (!globalLead) {
      globalLead = await createGlobalLead(supabase, {
        company_name: result.company_name,
        email,
        website: result.website,
        phone: result.phone,
        city: result.city,
        state: result.state,
        category_id: categoryId,
        provider_source: result.provider_source,
        provider_external_id: result.provider_external_id,
        lead_quality_status: classifyLeadQuality({ email, website: result.website }),
      })
    }

    if (!globalLead) {
      console.error('[searchService] Failed to create global_lead for:', result.company_name)
      continue
    }

    // --- User lead: check duplicate then create ---
    const existingUserLead = await findUserLeadByGlobalLead(supabase, userId, globalLead.id)

    if (existingUserLead) {
      results.push({
        company_name: result.company_name,
        website: result.website,
        email,
        phone: result.phone,
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
        company_name: result.company_name,
        website: result.website,
        email,
        phone: result.phone,
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
