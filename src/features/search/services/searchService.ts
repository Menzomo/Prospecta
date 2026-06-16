import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { countLeadsAddedThisMonth } from '../repositories/searchRepository'
import { findAvailableGlobalLeadsForUser } from '@/repositories/globalLeadRepository'
import type { SearchPreviewResponse } from '../types'

const MONTHLY_LIMIT = 20
const SEARCH_PREVIEW_LIMIT = 10
const ADMIN_SEARCH_LIMIT = 50

export async function executeLeadSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string,
  city: string,
  state?: string,
  isAdmin = false
): Promise<SearchPreviewResponse> {
  // Admin: unlimited preview, sees all matching leads regardless of prior ownership
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
        leads: [],
        monthly_remaining: -1,
        message: 'Nenhum lead disponível para essa categoria e cidade no momento.',
      }
    }

    return {
      leads: available.map((lead) => ({
        id: lead.id,
        company_name: lead.company_name,
        email: lead.email ?? '',
        website: lead.website,
        phone: lead.phone,
      })),
      monthly_remaining: -1,
    }
  }

  // Regular user: check monthly limit before querying
  const addedThisMonth = await countLeadsAddedThisMonth(supabase, userId)
  const monthly_remaining = MONTHLY_LIMIT - addedThisMonth

  if (monthly_remaining <= 0) {
    return {
      leads: [],
      monthly_remaining: 0,
      message: 'Você atingiu o limite de 20 leads do beta.',
    }
  }

  const available = await findAvailableGlobalLeadsForUser(supabase, {
    userId,
    categoryId,
    city,
    state,
    limit: SEARCH_PREVIEW_LIMIT,
  })

  if (available.length === 0) {
    return {
      leads: [],
      monthly_remaining,
      message: 'Nenhum lead disponível para essa categoria e cidade no momento.',
    }
  }

  return {
    leads: available.map((lead) => ({
      id: lead.id,
      company_name: lead.company_name,
      email: lead.email ?? '',
      website: lead.website,
      phone: lead.phone,
    })),
    monthly_remaining,
  }
}
