import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APIFY_ACTOR_ID = 'compass~google-maps-extractor'
const ENRICHMENT_KEYWORDS = /email|mail|contact|enrich|scrape|crawl|website|extract/i

type ApifyVersion = {
  versionNumber: string
  inputSchema?: string
  buildTag?: string
}

async function apifyGet(path: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.apify.com/v2/${path}?token=${token}`)
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseSchema(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, unknown> } catch { return null }
  }
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>
  return null
}

function filterEnrichment(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, val]) => {
      const v = val as Record<string, string> | undefined
      return (
        ENRICHMENT_KEYWORDS.test(key) ||
        ENRICHMENT_KEYWORDS.test(v?.title ?? '') ||
        ENRICHMENT_KEYWORDS.test(v?.description ?? '')
      )
    })
  )
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })

  // 1. List versions
  const versionsResp = await apifyGet(`acts/${APIFY_ACTOR_ID}/versions`, token)
  const versions = (versionsResp?.data as { items?: ApifyVersion[] } | undefined)?.items ?? []

  // 2. Try to find inputSchema in any version (prefer latest build tag)
  const sorted = [...versions].sort((a, b) =>
    (b.buildTag === 'latest' ? 1 : 0) - (a.buildTag === 'latest' ? 1 : 0)
  )

  let schemaSource: string | null = null
  let schemaProperties: Record<string, unknown> | null = null

  for (const v of sorted) {
    // Try fetching the specific version to get its full inputSchema
    const vResp = await apifyGet(`acts/${APIFY_ACTOR_ID}/versions/${v.versionNumber}`, token)
    const vData = vResp?.data as Record<string, unknown> | undefined
    const rawSchema = vData?.inputSchema ?? v.inputSchema
    const schema = parseSchema(rawSchema)
    const props = schema?.properties as Record<string, unknown> | undefined

    if (props && Object.keys(props).length > 1) {
      schemaSource = `version ${v.versionNumber}`
      schemaProperties = props
      break
    }
  }

  // 3. Fallback: try builds/latest which may carry inputSchema
  if (!schemaProperties) {
    const buildResp = await apifyGet(`acts/${APIFY_ACTOR_ID}/builds/latest`, token)
    const buildData = buildResp?.data as Record<string, unknown> | undefined
    const rawSchema = buildData?.inputSchema
    const schema = parseSchema(rawSchema)
    const props = schema?.properties as Record<string, unknown> | undefined
    if (props && Object.keys(props).length > 1) {
      schemaSource = 'builds/latest'
      schemaProperties = props
    }
  }

  if (!schemaProperties) {
    return NextResponse.json({
      actor_id: APIFY_ACTOR_ID,
      error: 'inputSchema.properties não encontrado em nenhuma versão ou build',
      versions_found: versions.map((v) => ({
        versionNumber: v.versionNumber,
        buildTag: v.buildTag,
        has_inputSchema: !!v.inputSchema,
      })),
    })
  }

  const allFields = Object.fromEntries(
    Object.entries(schemaProperties).map(([key, val]) => {
      const v = val as Record<string, unknown>
      return [key, { title: v.title, type: v.type, default: v.default, description: v.description }]
    })
  )

  return NextResponse.json({
    actor_id: APIFY_ACTOR_ID,
    schema_source: schemaSource,
    enrichment_related_fields: filterEnrichment(schemaProperties),
    all_fields: allFields,
  })
}
