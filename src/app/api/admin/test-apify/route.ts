import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 90

const bodySchema = z.object({
  categoria: z.string().min(1),
  cidade: z.string().min(1),
})

const APIFY_ACTOR_ID = 'compass~google-maps-extractor'
const RESULT_LIMIT = 5
const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 80_000

type TestApifyResult = {
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
}

// Recursively find all values where the key matches a pattern
function deepFindByKey(
  obj: unknown,
  pattern: RegExp,
  found: Record<string, unknown> = {},
  path = ''
): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return found
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = path ? `${path}.${key}` : key
    if (pattern.test(key)) found[fullKey] = val
    deepFindByKey(val, pattern, found, fullKey)
  }
  return found
}

async function apifyGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`https://api.apify.com/v2/${path}?token=${token}`)
  if (!res.ok) return null
  return res.json()
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  console.log('[test-apify] request started')

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

  const { categoria, cidade } = parsed.data
  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })

  const apifyInput = {
    searchStringsArray: [categoria],
    locationQuery: cidade,
    maxCrawledPlacesPerSearch: RESULT_LIMIT,
    language: 'pt-BR',
    scrapeContacts: true,
    website: 'withWebsite',
    searchMatching: 'all',
    includeWebResults: false,
    maximumLeadsEnrichmentRecords: 0,
    verifyLeadsEnrichmentEmails: false,
    scrapeDirectories: false,
    scrapeImageAuthors: false,
    scrapeOrderOnline: false,
    scrapePlaceDetailPage: false,
    scrapeReviewsPersonalData: true,
    scrapeSocialMediaProfiles: { facebooks: false, instagrams: false, tiktoks: false, twitters: false, youtubes: false },
    scrapeTableReservationProvider: false,
    skipClosedPlaces: false,
    placeMinimumStars: '',
    maxQuestions: 0,
    maxReviews: 0,
    reviewsSort: 'newest',
    reviewsFilterString: '',
    reviewsOrigin: 'all',
    maxImages: 0,
    allPlacesNoSearchAction: '',
  }

  console.log(`[test-apify] actor: ${APIFY_ACTOR_ID}, categoria: "${categoria}", cidade: "${cidade}"`)
  console.log('[test-apify] payload:', JSON.stringify(apifyInput))

  // --- 1. Start async run ---
  let runId: string
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}&memory=256`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apifyInput) }
    )
    if (!startRes.ok) {
      const errText = await startRes.text()
      return NextResponse.json({
        error: `Apify run start falhou ${startRes.status}`,
        apify_body: errText.slice(0, 500),
      }, { status: 502 })
    }
    const startData = await startRes.json() as { data?: { id?: string } }
    runId = startData.data?.id ?? ''
    if (!runId) return NextResponse.json({ error: 'Apify não retornou run id' }, { status: 502 })
    console.log(`[test-apify] run started: ${runId}`)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao iniciar run Apify', detail: String(err) }, { status: 502 })
  }

  // --- 2. Poll until SUCCEEDED or timeout ---
  let runStatus = 'RUNNING'
  let defaultDatasetId = ''
  const pollDeadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < pollDeadline && runStatus === 'RUNNING') {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const runData = await apifyGet(`acts/${APIFY_ACTOR_ID}/runs/${runId}`, token) as { data?: { status?: string; defaultDatasetId?: string } } | null
    runStatus = runData?.data?.status ?? 'UNKNOWN'
    defaultDatasetId = runData?.data?.defaultDatasetId ?? ''
    console.log(`[test-apify] run status: ${runStatus}`)
  }

  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({
      error: `Run não concluído a tempo. Status: ${runStatus}`,
      run_id: runId,
      execution_time_ms: Date.now() - startedAt,
    }, { status: 502 })
  }

  // --- 3. Discover all datasets for this run ---
  const datasetsResp = await apifyGet(`actor-runs/${runId}/datasets`, token) as { data?: { items?: Array<{ id: string; name?: string }> } } | null
  const extraDatasets = datasetsResp?.data?.items ?? []

  console.log(`[test-apify] defaultDatasetId: ${defaultDatasetId}, extra datasets: ${extraDatasets.length}`)

  // --- 4. Fetch items from default dataset ---
  const mainItemsResp = await apifyGet(`datasets/${defaultDatasetId}/items?limit=${RESULT_LIMIT}`, token) as unknown[] | null
  const mainItems = Array.isArray(mainItemsResp) ? mainItemsResp : []

  // --- 5. Fetch items from extra named datasets ---
  const namedDatasets: Record<string, unknown[]> = {}
  for (const ds of extraDatasets) {
    if (ds.id === defaultDatasetId) continue
    const items = await apifyGet(`datasets/${ds.id}/items?limit=10`, token) as unknown[] | null
    if (Array.isArray(items) && items.length > 0) {
      namedDatasets[ds.name ?? ds.id] = items
    }
  }

  const executionTimeMs = Date.now() - startedAt
  console.log(`[test-apify] main items: ${mainItems.length}, named datasets: ${Object.keys(namedDatasets).length}, time: ${executionTimeMs}ms`)

  // --- 6. Map simplified results ---
  const EMAIL_PATTERN = /email|mail|contact|domain|leads/i

  const results: TestApifyResult[] = mainItems.map((item) => {
    const it = item as Record<string, unknown>
    const emailFields = deepFindByKey(it, /^emails?$/i)
    const firstEmail = Object.values(emailFields).flatMap((v) => Array.isArray(v) ? v : [v]).find((v) => typeof v === 'string') as string | undefined
    return {
      company_name: (it.title ?? it.name ?? '') as string,
      email: firstEmail ?? null,
      website: (it.website ?? null) as string | null,
      phone: (it.phone ?? null) as string | null,
      city: (it.city ?? null) as string | null,
      state: (it.state ?? null) as string | null,
    }
  })

  // --- 7. Deep debug on first item ---
  const firstItem = mainItems[0] as Record<string, unknown> | undefined
  const rawDebug = firstItem
    ? {
        raw_keys: Object.keys(firstItem),
        deep_email_fields: deepFindByKey(firstItem, EMAIL_PATTERN),
        raw_sample: firstItem,
      }
    : null

  return NextResponse.json({
    run_id: runId,
    run_status: runStatus,
    execution_time_ms: executionTimeMs,
    results_count: results.length,
    results,
    named_datasets: Object.keys(namedDatasets).length > 0 ? namedDatasets : null,
    raw_debug: rawDebug,
  })
}
