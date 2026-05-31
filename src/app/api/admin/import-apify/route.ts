import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLeadCategoryById } from '@/repositories/leadCategoryRepository'
import { createApifyImportJob } from '@/repositories/apifyImportJobRepository'

const bodySchema = z.object({
  categoryId: z.string().uuid(),
  city: z.string().min(1),
  limit: z.number().int().min(5).max(200).default(200),
})

const APIFY_ACTOR_ID = 'compass~crawler-google-places'

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

  console.log(`[import-apify] starting run — categoria: ${category.name}, cidade: ${city}, limit: ${limit}`)

  // Start async run — do NOT wait for completion
  let apifyRunId: string
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

    const startData = await startRes.json() as { data?: { id?: string } }
    apifyRunId = startData.data?.id ?? ''
    if (!apifyRunId) return NextResponse.json({ error: 'Apify não retornou run id' }, { status: 502 })

    console.log(`[import-apify] run started: ${apifyRunId}`)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao iniciar run Apify', detail: String(err) }, { status: 502 })
  }

  // Persist job to DB
  const job = await createApifyImportJob(supabase, {
    created_by: user.id,
    category_id: categoryId,
    category_name: category.name,
    city,
    requested_limit: limit,
    status: 'running',
    apify_run_id: apifyRunId,
    payload: apifyInput as unknown as import('@/lib/supabase/types').Json,
  })

  if (!job) {
    return NextResponse.json({ error: 'Falha ao salvar job no banco' }, { status: 500 })
  }

  return NextResponse.json({ job_id: job.id, apify_run_id: apifyRunId, status: 'running' })
}
