import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Lead, CreateLeadDto } from '@/types/leads'
import { findDuplicateLead, createLead } from '@/repositories/leadRepository'

export type CreateLeadResult =
  | { success: true; lead: Lead }
  | { duplicate: 'email' | 'website' }
  | { error: true }

export async function createLeadWithDuplicateCheck(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: CreateLeadDto
): Promise<CreateLeadResult> {
  const duplicate = await findDuplicateLead(supabase, userId, dto.email, dto.website)

  if (duplicate) {
    return { duplicate }
  }

  const lead = await createLead(supabase, userId, dto)

  if (!lead) {
    // Supabase error já foi logado em leadRepository.createLead
    return { error: true }
  }

  return { success: true, lead }
}
