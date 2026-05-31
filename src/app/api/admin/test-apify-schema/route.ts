import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_ACTOR_ID = 'compass~google-maps-extractor'

export async function GET() {
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

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })
  }

  const actorUrl = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}?token=${apifyToken}`

  let actorData: Record<string, unknown>
  try {
    const response = await fetch(actorUrl)
    if (!response.ok) {
      const body = await response.text()
      return NextResponse.json(
        { error: `Apify retornou ${response.status}`, body: body.slice(0, 500) },
        { status: 502 }
      )
    }
    actorData = (await response.json()) as Record<string, unknown>
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao buscar schema', detail: String(error) }, { status: 502 })
  }

  const data = actorData.data as Record<string, unknown> | undefined
  const exampleRunInput = data?.exampleRunInput as Record<string, unknown> | undefined

  if (!exampleRunInput) {
    return NextResponse.json({
      error: 'exampleRunInput não encontrado',
      data_keys: data ? Object.keys(data) : [],
      actor_keys: Object.keys(actorData),
    })
  }

  const enrichmentKeywords = /email|mail|contact|enrich|scrape|crawl|website|extract/i

  const enrichmentRelated = Object.fromEntries(
    Object.entries(exampleRunInput).filter(([key]) => enrichmentKeywords.test(key))
  )

  return NextResponse.json({
    actor_id: APIFY_ACTOR_ID,
    example_run_input: exampleRunInput,
    enrichment_related_fields: enrichmentRelated,
  })
}
