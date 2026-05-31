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
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 80_000

type TestApifyResult = {
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
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
    scrapeDirectories: false,
    scrapeImageAuthors: false,
    scrapeOrderOnline: false,
    scrapePlaceDetailPage: false,
    scrapeReviewsPersonalData: false,
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

  // 1. Start run
  let runId: string
  let defaultDatasetId: string
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}&memory=256`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apifyInput) }
    )
    if (!startRes.ok) {
      const errText = await startRes.text()
      return NextResponse.json({ error: `Run start falhou ${startRes.status}`, apify_body: errText.slice(0, 500) }, { status: 502 })
    }
    const startData = await startRes.json() as { data?: { id?: string; defaultDatasetId?: string } }
    runId = startData.data?.id ?? ''
    defaultDatasetId = startData.data?.defaultDatasetId ?? ''
    if (!runId) return NextResponse.json({ error: 'Apify não retornou run id' }, { status: 502 })
    console.log(`[test-apify] run id: ${runId}, dataset id: ${defaultDatasetId}`)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao iniciar run', detail: String(err) }, { status: 502 })
  }

  // 2. Poll until SUCCEEDED
  let runStatus = 'RUNNING'
  const pollDeadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < pollDeadline && (runStatus === 'RUNNING' || runStatus === 'READY')) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    try {
      const pollRes = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs/${runId}?token=${token}`)
      const pollData = await pollRes.json() as { data?: { status?: string; defaultDatasetId?: string } }
      runStatus = pollData.data?.status ?? 'UNKNOWN'
      if (pollData.data?.defaultDatasetId) defaultDatasetId = pollData.data.defaultDatasetId
      console.log(`[test-apify] run status: ${runStatus}`)
    } catch {
      break
    }
  }

  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({
      error: `Run não concluído. Status: ${runStatus}`,
      run_id: runId,
      execution_time_ms: Date.now() - startedAt,
    }, { status: 502 })
  }

  // 3. Fetch all items from defaultDataset
  let rawItems: Record<string, unknown>[]
  try {
    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}&limit=${RESULT_LIMIT}&clean=true`
    )
    if (!itemsRes.ok) {
      const errText = await itemsRes.text()
      return NextResponse.json({ error: `Dataset fetch falhou ${itemsRes.status}`, body: errText.slice(0, 300) }, { status: 502 })
    }
    rawItems = await itemsRes.json() as Record<string, unknown>[]
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar dataset', detail: String(err) }, { status: 502 })
  }

  const executionTimeMs = Date.now() - startedAt
  console.log(`[test-apify] items: ${rawItems.length}, time: ${executionTimeMs}ms`)

  // 4. Map simplified results
  const results: TestApifyResult[] = rawItems.map((item) => ({
    company_name: String(item.title ?? item.name ?? ''),
    email: (item.emails as string[] | undefined)?.[0] ?? (item.email as string | undefined) ?? null,
    website: (item.website as string | undefined) ?? null,
    phone: (item.phone as string | undefined) ?? null,
    city: (item.city as string | undefined) ?? null,
    state: (item.state as string | undefined) ?? null,
  }))

  const itemsWithEmail = rawItems.filter((it) => {
    const emails = it.emails as string[] | undefined
    return Array.isArray(emails) && emails.length > 0
  }).length

  // 5. Raw debug — full first item + all keys
  const firstItem = rawItems[0]
  const rawDebug = firstItem
    ? {
        all_keys: Object.keys(firstItem),
        email_related: Object.fromEntries(
          Object.entries(firstItem).filter(([k]) => /email|mail|contact|domain|enrich/i.test(k))
        ),
        raw_sample: firstItem,
      }
    : null

  return NextResponse.json({
    run_id: runId,
    dataset_id: defaultDatasetId,
    execution_time_ms: executionTimeMs,
    results_count: rawItems.length,
    items_with_email: itemsWithEmail,
    results,
    raw_debug: rawDebug,
  })
}
