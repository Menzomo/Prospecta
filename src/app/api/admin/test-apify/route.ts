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

type ApifyRawItem = {
  title?: string
  name?: string
  emails?: string[]
  email?: string
  website?: string
  phone?: string
  city?: string
  state?: string
}

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
    return NextResponse.json(
      { error: 'Dados inválidos', details: z.flattenError(parsed.error) },
      { status: 400 }
    )
  }

  const { categoria, cidade } = parsed.data

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })
  }

  const apifyUrlDebug = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?memory=128&timeout=80`
  const apifyUrl = `${apifyUrlDebug}&token=${apifyToken}`

  console.log(`[test-apify] actor: ${APIFY_ACTOR_ID}, categoria: "${categoria}", cidade: "${cidade}"`)
  console.log(`[test-apify] url (sem token): ${apifyUrlDebug}`)

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
    scrapeSocialMediaProfiles: {
      facebooks: false,
      instagrams: false,
      tiktoks: false,
      twitters: false,
      youtubes: false,
    },
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

  console.log('[test-apify] payload:', JSON.stringify(apifyInput))

  let rawItems: ApifyRawItem[]
  let runId: string | null = null

  try {
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apifyInput),
      signal: AbortSignal.timeout(85_000),
    })

    runId = response.headers.get('X-Apify-Run-Id')
    console.log(`[test-apify] actor run id: ${runId ?? 'unknown'}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[test-apify] Apify error ${response.status}: ${errorText.slice(0, 300)}`)
      return NextResponse.json(
        {
          error: `Apify retornou erro ${response.status}`,
          debug: {
            actor_id: APIFY_ACTOR_ID,
            apify_url: apifyUrlDebug,
            apify_status: response.status,
            apify_body: errorText.slice(0, 500),
          },
        },
        { status: 502 }
      )
    }

    rawItems = (await response.json()) as ApifyRawItem[]
  } catch (error) {
    console.error('[test-apify] fetch error:', error)
    return NextResponse.json(
      {
        error: 'Falha ao chamar Apify',
        debug: {
          actor_id: APIFY_ACTOR_ID,
          apify_url: apifyUrlDebug,
        },
      },
      { status: 502 }
    )
  }

  const results: TestApifyResult[] = rawItems.slice(0, RESULT_LIMIT).map((item) => ({
    company_name: item.title ?? item.name ?? '',
    email: item.emails?.[0] ?? item.email ?? null,
    website: item.website ?? null,
    phone: item.phone ?? null,
    city: item.city ?? null,
    state: item.state ?? null,
  }))

  const executionTimeMs = Date.now() - startedAt
  console.log(`[test-apify] items returned: ${results.length}, execution time: ${executionTimeMs}ms`)

  const firstItem = rawItems[0] as Record<string, unknown> | undefined
  const rawDebug = firstItem
    ? {
        raw_keys: Object.keys(firstItem),
        raw_email_related_fields: Object.fromEntries(
          Object.entries(firstItem).filter(([k]) =>
            /email|mail|contact/i.test(k)
          )
        ),
        raw_sample: firstItem,
      }
    : null

  return NextResponse.json({
    run_id: runId,
    execution_time_ms: executionTimeMs,
    results_count: results.length,
    results,
    raw_debug: rawDebug,
  })
}
