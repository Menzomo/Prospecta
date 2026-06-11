import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countLeadsAddedThisMonth } from '@/features/search/repositories/searchRepository'
import { createUserLead } from '@/repositories/userLeadRepository'

const MONTHLY_LIMIT = 200

// Max 200 — the monthly limit is the real cap for regular users; admins have no effective limit
const confirmSchema = z.object({
  global_lead_ids: z
    .array(z.string().uuid('ID de lead inválido'))
    .min(1, 'Selecione ao menos 1 lead')
    .max(200, 'Máximo de 200 leads por vez'),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const validation = confirmSchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: 'Dados inválidos', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { global_lead_ids } = validation.data

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Monthly limit check (skip for admin)
  let addedThisMonth = 0
  let monthly_remaining = -1

  if (!isAdmin) {
    addedThisMonth = await countLeadsAddedThisMonth(supabase, user.id)
    monthly_remaining = MONTHLY_LIMIT - addedThisMonth

    if (monthly_remaining <= 0) {
      return Response.json(
        { error: 'Limite mensal de leads atingido. Seu limite renova no próximo mês.' },
        { status: 400 }
      )
    }
  }

  // Cap to remaining quota for non-admin
  const idsToProcess = isAdmin ? global_lead_ids : global_lead_ids.slice(0, monthly_remaining)

  // Validate that leads exist, are active, and have email_found quality
  const { data: validLeads, error: leadsError } = await supabase
    .from('global_leads')
    .select('id')
    .in('id', idsToProcess)
    .eq('status', 'active')
    .eq('lead_quality_status', 'email_found')

  if (leadsError) {
    console.error('[confirm] Failed to validate global_leads:', leadsError.message)
    return Response.json({ error: 'Erro ao validar leads.' }, { status: 500 })
  }

  const validIds = new Set((validLeads ?? []).map((l) => l.id))

  // Skip leads already in user_leads (prevent UNIQUE constraint errors)
  const { data: existingLinks } = await supabase
    .from('user_leads')
    .select('global_lead_id')
    .eq('user_id', user.id)
    .in('global_lead_id', idsToProcess)

  const alreadyOwnedSet = new Set((existingLinks ?? []).map((l) => l.global_lead_id))

  const eligibleIds = idsToProcess.filter(
    (id) => validIds.has(id) && !alreadyOwnedSet.has(id)
  )

  const already_owned = idsToProcess.filter((id) => alreadyOwnedSet.has(id)).length
  const skipped_invalid = idsToProcess.filter(
    (id) => !validIds.has(id) && !alreadyOwnedSet.has(id)
  ).length

  // Log skipped leads for admin review
  if (skipped_invalid > 0) {
    const skippedIds = idsToProcess.filter(
      (id) => !validIds.has(id) && !alreadyOwnedSet.has(id)
    )
    console.warn('[confirm] Leads skipped (not active/email_found):', {
      userId: user.id,
      count: skipped_invalid,
      ids: skippedIds,
    })
  }

  let added = 0
  for (const globalLeadId of eligibleIds) {
    const result = await createUserLead(supabase, user.id, {
      global_lead_id: globalLeadId,
      status: 'novo',
    })
    if (result) added++
  }

  const finalRemaining = isAdmin ? -1 : monthly_remaining - added

  return Response.json({ added, already_owned, skipped_invalid, monthly_remaining: finalRemaining })
}
