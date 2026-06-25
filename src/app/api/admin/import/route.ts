import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import {
  findGlobalLeadByNameAndCity,
  findGlobalLeadByWebsite,
  createGlobalLead,
} from '@/repositories/globalLeadRepository'
import { classifyLeadQuality } from '@/utils/classifyLeadQuality'
import type { ImportSummary } from '@/features/admin/utils/parseImportFile'

const importRowSchema = z.object({
  company_name: z.string(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
})

const bodySchema = z.object({
  category_id: z.string().uuid('category_id deve ser um UUID válido'),
  rows: z.array(importRowSchema).min(1).max(500),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { category_id, rows } = parsed.data

  // Validate that the chosen category exists
  const categories = await listLeadCategories(supabase)
  const categoryExists = categories.some((c) => c.id === category_id)
  if (!categoryExists) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 })
  }

  const summary: ImportSummary = {
    imported: 0,
    skipped_duplicate: 0,
    invalid: 0,
    complete: 0,
    email_only: 0,
    phone_only: 0,
    incomplete: 0,
  }

  for (const row of rows) {
    const companyName = row.company_name.trim()

    if (!companyName) {
      summary.invalid++
      continue
    }

    const city = row.city?.trim() || null
    const email = row.email?.trim() || null
    const website = row.website?.trim() || null

    // Dedup 1: same website
    if (website) {
      const existing = await findGlobalLeadByWebsite(supabase, website)
      if (existing) { summary.skipped_duplicate++; continue }
    }

    // Dedup 2: same company name + city
    if (companyName && city) {
      const existing = await findGlobalLeadByNameAndCity(supabase, companyName, city)
      if (existing) { summary.skipped_duplicate++; continue }
    }

    // Dedup 3: city is null and no website — cannot deduplicate safely, skip
    if (!city && !website) {
      console.warn(`[import] Skipping lead without city or website: "${companyName}"`)
      summary.invalid++
      continue
    }

    const phone = row.phone?.trim() || null
    const qualityStatus = classifyLeadQuality({ email, phone, website })

    const created = await createGlobalLead(supabase, {
      company_name: companyName,
      email,
      website,
      phone,
      city,
      state: row.state?.trim() || null,
      category_id,
      provider_source: 'manual',
      provider_external_id: null,
      lead_quality_status: qualityStatus,
      status: qualityStatus === 'incomplete' ? 'rejected' : 'pending_review',
    })

    if (created) {
      summary.imported++
      summary[qualityStatus]++
    }
  }

  return NextResponse.json({ summary })
}
