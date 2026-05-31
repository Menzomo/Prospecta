import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLeadCategoryById } from '@/repositories/leadCategoryRepository'
import {
  findGlobalLeadByProviderExternalId,
  findGlobalLeadByWebsite,
  findGlobalLeadByNameAndCity,
  createGlobalLead,
} from '@/repositories/globalLeadRepository'
import { classifyLeadQuality } from '@/utils/classifyLeadQuality'

export const maxDuration = 90

const bodySchema = z.object({
  categoryId: z.string().uuid(),
  city: z.string().min(1),
  limit: z.number().int().min(5).max(200).default(200),
})

const APIFY_ACTOR_ID = 'compass~crawler-google-places'
const LOW_STOCK_THRESHOLD = 200

type ApifyItem = {
  title?: string
  emails?: string[]
  website?: string
  phone?: string
  city?: string
  state?: string
  placeId?: string
}

type ImportSummary = {
  imported: number
  skipped_duplicate: number
  invalid: number
  email_found: number
  website_only: number
  manual_review: number
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: z.flattenError(parsed.error) }, { status: 400 })
  }

  const { categoryId, city: rawCity, limit } = parsed.data

  const category = await getLeadCategoryById(supabase, categoryId)
  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 })
  }

  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })

  // Normalize city: "caxias do sul,rs" → "Caxias do Sul, RS"
  const city = rawCity
    .trim()
    .split(',')
    .map((part, i) => {
      const trimmed = part.trim()
      if (i === 0) return trimmed.replace(/\b\w/g, (c) => c.toUpperCase())
      return trimmed.toUpperCase()
    })
    .join(', ')

  const apifyInput = {
    searchStringsArray: [category.name],
    locationQuery: city,
    maxCrawledPlacesPerSearch: limit,
    language: 'pt-BR',
    scrapeContacts: true,
    website: 'withWebsite',
  }

  const apifyUrlDebug = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?memory=512&timeout=80`

  console.log(`[import-apify] categoria: ${category.name}, cidade: ${city}, limit: ${limit}`)
  console.log(`[import-apify] payload: ${JSON.stringify(apifyInput)}`)
  console.log(`[import-apify] url (sem token): ${apifyUrlDebug}`)

  let rawItems: ApifyItem[]
  try {
    const res = await fetch(
      `${apifyUrlDebug}&token=${token}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apifyInput), signal: AbortSignal.timeout(85_000) }
    )
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[import-apify] Apify error ${res.status}: ${errText.slice(0, 400)}`)
      return NextResponse.json({
        error: `Apify retornou ${res.status}`,
        apify_status: res.status,
        apify_body: errText.slice(0, 500),
        payload_sent: apifyInput,
      }, { status: 502 })
    }
    rawItems = await res.json() as ApifyItem[]
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao chamar Apify', detail: String(err) }, { status: 502 })
  }

  console.log(`[import-apify] Apify retornou ${rawItems.length} itens`)

  const summary: ImportSummary = {
    imported: 0,
    skipped_duplicate: 0,
    invalid: 0,
    email_found: 0,
    website_only: 0,
    manual_review: 0,
  }

  for (const item of rawItems) {
    const companyName = item.title?.trim() ?? ''
    if (!companyName) {
      summary.invalid++
      continue
    }

    const email = item.emails?.[0]?.trim() || null
    const website = item.website?.trim() || null
    const phone = item.phone?.trim() || null
    const itemCity = item.city?.trim() || null
    const state = item.state?.trim() || null
    const placeId = item.placeId?.trim() || null

    // Dedup: placeId → website → company_name + city
    if (placeId) {
      const existing = await findGlobalLeadByProviderExternalId(supabase, 'apify', placeId)
      if (existing) { summary.skipped_duplicate++; continue }
    }

    if (website) {
      const existing = await findGlobalLeadByWebsite(supabase, website)
      if (existing) { summary.skipped_duplicate++; continue }
    }

    if (companyName && itemCity) {
      const existing = await findGlobalLeadByNameAndCity(supabase, companyName, itemCity)
      if (existing) { summary.skipped_duplicate++; continue }
    }

    const qualityStatus = classifyLeadQuality({ email, website })

    const created = await createGlobalLead(supabase, {
      company_name: companyName,
      email,
      website,
      phone,
      city: itemCity,
      state,
      category_id: categoryId,
      provider_source: 'apify',
      provider_external_id: placeId,
      lead_quality_status: qualityStatus,
    })

    if (created) {
      summary.imported++
      summary[qualityStatus]++
    }
  }

  console.log(`[import-apify] importados: ${summary.imported}, duplicatas: ${summary.skipped_duplicate}`)

  return NextResponse.json({
    summary,
    low_stock_alert: summary.email_found < LOW_STOCK_THRESHOLD,
  })
}
