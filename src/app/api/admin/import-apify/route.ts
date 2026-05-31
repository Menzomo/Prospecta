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
  limit: z.number().int().min(5).max(30).default(20),
})

const APIFY_ACTOR_ID = 'compass~crawler-google-places'
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 80_000

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

function normalizeCity(raw: string): string {
  return raw
    .trim()
    .split(',')
    .map((part, i) => {
      const trimmed = part.trim()
      if (i === 0) return trimmed.replace(/\b\w/g, (c) => c.toUpperCase())
      return trimmed.toUpperCase()
    })
    .join(', ')
}

async function apifyFetch(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
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
  const city = normalizeCity(rawCity)

  const category = await getLeadCategoryById(supabase, categoryId)
  if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 })

  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })

  const apifyInput = {
    searchStringsArray: [category.name],
    locationQuery: city,
    maxCrawledPlacesPerSearch: limit,
    language: 'pt-BR',
    scrapeContacts: true,
    website: 'withWebsite',
  }

  console.log(`[import-apify] categoria: ${category.name}, cidade: ${city}, limit: ${limit}`)
  console.log(`[import-apify] payload: ${JSON.stringify(apifyInput)}`)

  // 1. Start async run
  let runId: string
  let defaultDatasetId: string

  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}&memory=512`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apifyInput) }
    )

    if (!startRes.ok) {
      const errText = await startRes.text()
      console.error(`[import-apify] run start failed ${startRes.status}: ${errText.slice(0, 400)}`)
      return NextResponse.json({
        error: `Apify retornou ${startRes.status}`,
        apify_status: startRes.status,
        apify_body: errText.slice(0, 500),
        payload_sent: apifyInput,
      }, { status: 502 })
    }

    const startData = await startRes.json() as { data?: { id?: string; defaultDatasetId?: string } }
    runId = startData.data?.id ?? ''
    defaultDatasetId = startData.data?.defaultDatasetId ?? ''

    if (!runId) return NextResponse.json({ error: 'Apify não retornou run id' }, { status: 502 })
    console.log(`[import-apify] run started: ${runId}`)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao iniciar run Apify', detail: String(err) }, { status: 502 })
  }

  // 2. Poll until SUCCEEDED or timeout
  let runStatus = 'RUNNING'
  const pollDeadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < pollDeadline && (runStatus === 'RUNNING' || runStatus === 'READY')) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    try {
      const pollData = await apifyFetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      ) as { data?: { status?: string; defaultDatasetId?: string } } | null

      runStatus = pollData?.data?.status ?? 'UNKNOWN'
      if (pollData?.data?.defaultDatasetId) defaultDatasetId = pollData.data.defaultDatasetId
      console.log(`[import-apify] run status: ${runStatus}`)
    } catch {
      break
    }
  }

  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({
      error: `Run não concluído dentro do tempo limite. Status: ${runStatus}`,
      run_id: runId,
      hint: runStatus === 'RUNNING'
        ? 'O run ainda está em execução na Apify. Tente importar um lote menor.'
        : undefined,
    }, { status: 502 })
  }

  // 3. Fetch dataset items
  let rawItems: ApifyItem[]
  try {
    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}&limit=${limit}`
    )
    if (!itemsRes.ok) {
      const errText = await itemsRes.text()
      return NextResponse.json({ error: `Dataset fetch falhou ${itemsRes.status}`, detail: errText.slice(0, 300) }, { status: 502 })
    }
    rawItems = await itemsRes.json() as ApifyItem[]
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar dataset', detail: String(err) }, { status: 502 })
  }

  console.log(`[import-apify] Apify retornou ${rawItems.length} itens`)

  // 4. Dedup + classify + insert
  const summary: ImportSummary = { imported: 0, skipped_duplicate: 0, invalid: 0, email_found: 0, website_only: 0, manual_review: 0 }

  for (const item of rawItems) {
    const companyName = item.title?.trim() ?? ''
    if (!companyName) { summary.invalid++; continue }

    const email = item.emails?.[0]?.trim() || null
    const website = item.website?.trim() || null
    const phone = item.phone?.trim() || null
    const itemCity = item.city?.trim() || null
    const state = item.state?.trim() || null
    const placeId = item.placeId?.trim() || null

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

  return NextResponse.json({ run_id: runId, summary })
}
