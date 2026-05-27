import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { countLeadsSavedTodayFromSearch } from '../repositories/searchRepository'
import { findAvailableGlobalLeadsForUser } from '@/repositories/globalLeadRepository'
import { createUserLead } from '@/repositories/userLeadRepository'
import type { SearchResultItem, SearchApiResponse } from '../types'

const DAILY_LIMIT = 5
const ADMIN_SEARCH_LIMIT = 50

export async function executeLeadSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string,
  city: string,
  state?: string,
  isAdmin = false
): Promise<SearchApiResponse> {
  // Admin: unlimited searches, no user_leads created, sees all matching leads each time
  if (isAdmin) {
    const available = await findAvailableGlobalLeadsForUser(supabase, {
      userId,
      categoryId,
      city,
      state,
      limit: ADMIN_SEARCH_LIMIT,
      skipExcludeOwned: true,
    })

    if (available.length === 0) {
      return {
        results: [],
        saved: 0,
        daily_remaining: ADMIN_SEARCH_LIMIT,
        message: 'Nenhum lead disponível para essa categoria e cidade no momento.',
      }
    }

    return {
      results: available.map((lead) => ({
        company_name: lead.company_name,
        website: lead.website,
        email: lead.email ?? '',
        phone: lead.phone,
        outcome: 'saved' as const,
      })),
      saved: available.length,
      daily_remaining: ADMIN_SEARCH_LIMIT - available.length,
    }
  }

  // Regular user: enforce daily limit, create user_leads
  const savedToday = await countLeadsSavedTodayFromSearch(supabase, userId)
  const remaining = DAILY_LIMIT - savedToday

  if (remaining <= 0) {
    return { results: [], saved: 0, daily_remaining: 0 }
  }

  const available = await findAvailableGlobalLeadsForUser(supabase, {
    userId,
    categoryId,
    city,
    state,
    limit: remaining,
  })

  if (available.length === 0) {
    return {
      results: [],
      saved: 0,
      daily_remaining: remaining,
      message: 'Nenhum lead disponível para essa categoria e cidade no momento.',
    }
  }

  const results: SearchResultItem[] = []
  let savedCount = 0

  for (const lead of available) {
    const userLead = await createUserLead(supabase, userId, {
      global_lead_id: lead.id,
      status: 'novo',
    })

    if (userLead) {
      savedCount++
      results.push({
        company_name: lead.company_name,
        website: lead.website,
        email: lead.email ?? '',
        phone: lead.phone,
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
