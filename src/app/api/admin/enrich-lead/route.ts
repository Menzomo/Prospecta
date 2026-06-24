// Endpoint para o n8n publicar resultados de enriquecimento
// Autenticação: Authorization: Bearer CRON_SECRET

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeLeadQualityStatus } from '@/types/globalLeads'

export const dynamic = 'force-dynamic'

const enrichResultSchema = z.object({
  id: z.string().uuid('id deve ser um UUID válido'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  // Rejeição automática: site inválido, sem contatos encontrados, etc.
  auto_reject: z.boolean().optional().default(false),
  rejection_reason: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const validation = enrichResultSchema.safeParse(body)
  if (!validation.success) {
    return Response.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 422 })
  }

  const { id, email, phone, auto_reject, rejection_reason } = validation.data
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Casos 4 e 5: rejeição automática (sem contatos ou site inválido)
  if (auto_reject) {
    const { error } = await supabase
      .from('global_leads')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason ?? 'auto_rejected_by_enrichment',
        last_enrichment_at: now,
        updated_at: now,
      })
      .eq('id', id)

    if (error) {
      console.error('[enrich-lead] auto_reject error:', error.message)
      return Response.json({ error: 'Falha ao rejeitar lead' }, { status: 500 })
    }

    return Response.json({ ok: true, action: 'rejected' })
  }

  const resolvedEmail = email ?? null
  const resolvedPhone = phone ?? null
  const hasContact = !!(resolvedEmail || resolvedPhone)

  if (!hasContact) {
    // n8n não encontrou nada → pending_review para decisão humana
    const { error } = await supabase
      .from('global_leads')
      .update({ status: 'pending_review', last_enrichment_at: now, updated_at: now })
      .eq('id', id)

    if (error) {
      console.error('[enrich-lead] no-contact update error:', error.message)
      return Response.json({ error: 'Falha ao atualizar lead' }, { status: 500 })
    }

    return Response.json({ ok: true, action: 'pending_review', reason: 'no_contacts_found' })
  }

  // n8n encontrou contatos → atualiza campos e manda para pending_review
  const qualityStatus = computeLeadQualityStatus(resolvedEmail, resolvedPhone)

  const patch: {
    lead_quality_status: string
    status: string
    last_enrichment_at: string
    updated_at: string
    email?: string
    phone?: string
  } = {
    lead_quality_status: qualityStatus,
    status: 'pending_review',
    last_enrichment_at: now,
    updated_at: now,
  }
  if (resolvedEmail) patch.email = resolvedEmail
  if (resolvedPhone) patch.phone = resolvedPhone

  const { error } = await supabase
    .from('global_leads')
    .update(patch)
    .eq('id', id)

  if (error) {
    console.error('[enrich-lead] enrich update error:', error.message)
    return Response.json({ error: 'Falha ao enriquecer lead' }, { status: 500 })
  }

  return Response.json({ ok: true, action: 'pending_review', quality: qualityStatus })
}
