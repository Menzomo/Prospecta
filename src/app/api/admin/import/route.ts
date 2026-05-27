import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import {
  findGlobalLeadByNameAndCity,
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
  category: z.string().nullable().optional(),
})

const bodySchema = z.object({
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

  const { rows } = parsed.data

  // Load all categories once — resolve name→id in memory
  const categories = await listLeadCategories(supabase)
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  const summary: ImportSummary = {
    imported: 0,
    skipped_duplicate: 0,
    invalid: 0,
    email_found: 0,
    website_only: 0,
    manual_review: 0,
  }

  for (const row of rows) {
    const companyName = row.company_name.trim()

    if (!companyName) {
      summary.invalid++
      continue
    }

    const city = row.city?.trim() ?? null
    const email = row.email?.trim() || null
    const website = row.website?.trim() || null

    // Dedup: same company name + city → skip
    if (companyName && city) {
      const existing = await findGlobalLeadByNameAndCity(supabase, companyName, city)
      if (existing) {
        summary.skipped_duplicate++
        continue
      }
    }

    const categoryId = row.category
      ? (categoryMap.get(row.category.toLowerCase().trim()) ?? null)
      : null

    const qualityStatus = classifyLeadQuality({ email, website })

    const created = await createGlobalLead(supabase, {
      company_name: companyName,
      email,
      website,
      phone: row.phone?.trim() || null,
      city,
      state: row.state?.trim() || null,
      category_id: categoryId,
      provider_source: 'apify',
      provider_external_id: null,
      lead_quality_status: qualityStatus,
    })

    if (created) {
      summary.imported++
      summary[qualityStatus]++
    }
  }

  return NextResponse.json({ summary })
}
