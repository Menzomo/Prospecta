import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 90

const bodySchema = z.object({
  categoria: z.string().min(1),
  cidade: z.string().min(1),
})

const APIFY_ACTOR_ID = 'compass~crawler-google-places'
const RESULT_LIMIT = 5

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
  }

  const syncUrl = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${token}&memory=512&timeout=80`
  const syncUrlDebug = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?memory=512&timeout=80`

  console.log(`[test-apify] actor: ${APIFY_ACTOR_ID}`)
  console.log(`[test-apify] url (sem token): ${syncUrlDebug}`)
  console.log(`[test-apify] categoria: "${categoria}", cidade: "${cidade}"`)

  let rawItems: Record<string, unknown>[]
  let runId: string | null = null

  try {
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apifyInput),
      signal: AbortSignal.timeout(85_000),
    })

    runId = res.headers.get('X-Apify-Run-Id')
    console.log(`[test-apify] run id: ${runId ?? 'unknown'}`)

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[test-apify] Apify error ${res.status}: ${errText.slice(0, 300)}`)
      return NextResponse.json({
        error: `Apify retornou erro ${res.status}`,
        debug: { actor_id: APIFY_ACTOR_ID, url: syncUrlDebug, apify_body: errText.slice(0, 500) },
      }, { status: 502 })
    }

    rawItems = await res.json() as Record<string, unknown>[]
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao chamar Apify', detail: String(err) }, { status: 502 })
  }

  const executionTimeMs = Date.now() - startedAt
  console.log(`[test-apify] items: ${rawItems.length}, time: ${executionTimeMs}ms`)

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
    actor_id: APIFY_ACTOR_ID,
    execution_time_ms: executionTimeMs,
    results_count: rawItems.length,
    items_with_email: itemsWithEmail,
    results,
    raw_debug: rawDebug,
  })
}
