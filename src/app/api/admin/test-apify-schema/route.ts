import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_ACTOR_ID = 'compass~google-maps-extractor'

type SchemaProperty = {
  title?: string
  description?: string
  type?: string
  default?: unknown
  enum?: unknown[]
}

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
  const rawSchema = data?.inputSchema ?? actorData.inputSchema

  let schema: Record<string, unknown> | null = null
  if (typeof rawSchema === 'string') {
    try {
      schema = JSON.parse(rawSchema) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Falha ao parsear inputSchema', raw: rawSchema }, { status: 500 })
    }
  } else if (typeof rawSchema === 'object' && rawSchema !== null) {
    schema = rawSchema as Record<string, unknown>
  }

  if (!schema) {
    return NextResponse.json({
      error: 'inputSchema não encontrado na resposta do actor',
      actor_keys: Object.keys(actorData),
      data_keys: data ? Object.keys(data) : [],
    })
  }

  const properties = schema.properties as Record<string, SchemaProperty> | undefined

  if (!properties) {
    return NextResponse.json({ schema_full: schema })
  }

  const enrichmentKeywords = /email|mail|contact|enrich|scrape|crawl|website|extract/i

  const enrichmentFields = Object.fromEntries(
    Object.entries(properties).filter(([key, val]) =>
      enrichmentKeywords.test(key) ||
      enrichmentKeywords.test(val.title ?? '') ||
      enrichmentKeywords.test(val.description ?? '')
    )
  )

  return NextResponse.json({
    actor_id: APIFY_ACTOR_ID,
    all_fields: Object.fromEntries(
      Object.entries(properties).map(([key, val]) => [
        key,
        { title: val.title, type: val.type, default: val.default, description: val.description },
      ])
    ),
    enrichment_related_fields: enrichmentFields,
  })
}
