import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getApifyImportJobById,
  updateApifyImportJob,
} from '@/repositories/apifyImportJobRepository'
import {
  findGlobalLeadByProviderExternalId,
  findGlobalLeadByWebsite,
  findGlobalLeadByNameAndCity,
  createGlobalLead,
} from '@/repositories/globalLeadRepository'
import { classifyLeadQuality } from '@/utils/classifyLeadQuality'

export const maxDuration = 90

type ApifyItem = {
  title?: string
  emails?: string[]
  website?: string
  phone?: string
  city?: string
  state?: string
  placeId?: string
}

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const job = await getApifyImportJobById(supabase, id)
  if (!job) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

  if (!job.apify_run_id) {
    return NextResponse.json({ error: 'Job sem apify_run_id', job }, { status: 400 })
  }

  if (job.status === 'succeeded' || job.status === 'failed') {
    return NextResponse.json({ message: 'Job já finalizado', job })
  }

  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'APIFY_TOKEN não configurado' }, { status: 500 })

  // Check Apify run status — log full response for diagnosis
  let runStatus: string
  let defaultDatasetId: string = job.apify_dataset_id ?? ''
  let runDataFull: Record<string, unknown> = {}

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${job.apify_run_id}?token=${token}`
    )
    if (!runRes.ok) {
      const errText = await runRes.text()
      return NextResponse.json({
        error: `Apify retornou ${runRes.status} ao consultar run`,
        apify_body: errText.slice(0, 500),
      }, { status: 502 })
    }
    runDataFull = await runRes.json() as Record<string, unknown>
    const runDataObj = runDataFull.data as Record<string, unknown> | undefined
    runStatus = (runDataObj?.status as string | undefined) ?? 'UNKNOWN'

    // Extract dataset ID from all known locations
    const dsFromData = runDataObj?.defaultDatasetId as string | undefined
    const dsFromRoot = runDataFull.defaultDatasetId as string | undefined
    if (dsFromData) defaultDatasetId = dsFromData
    else if (dsFromRoot) defaultDatasetId = dsFromRoot

    console.log(`[import-apify/sync] job ${id}, run ${job.apify_run_id}`)
    console.log(`[import-apify/sync] status: ${runStatus}, defaultDatasetId: ${defaultDatasetId}`)
    console.log(`[import-apify/sync] run data keys: ${Object.keys(runDataObj ?? {}).join(', ')}`)
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao consultar Apify', detail: String(err) }, { status: 502 })
  }

  if (runStatus === 'RUNNING' || runStatus === 'READY') {
    await updateApifyImportJob(supabase, id, { status: 'running' })
    return NextResponse.json({ message: 'Run ainda em execução', run_status: runStatus, job: { ...job, status: 'running' } })
  }

  if (runStatus === 'FAILED' || runStatus === 'TIMED-OUT' || runStatus === 'ABORTED') {
    await updateApifyImportJob(supabase, id, {
      status: 'failed',
      error_message: `Apify run encerrou com status: ${runStatus}`,
      finished_at: new Date().toISOString(),
    })
    return NextResponse.json({ message: `Run falhou: ${runStatus}`, job })
  }

  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({
      message: `Status inesperado: ${runStatus}`,
      run_status: runStatus,
      default_dataset_id_found: defaultDatasetId || null,
      run_data_keys: Object.keys((runDataFull.data as Record<string, unknown> | undefined) ?? {}),
    })
  }

  // Dataset ID guard — if missing, return diagnostic without changing job status
  if (!defaultDatasetId) {
    const runDataObj = runDataFull.data as Record<string, unknown> | undefined
    return NextResponse.json({
      error: 'defaultDatasetId não encontrado na resposta do run',
      run_status: runStatus,
      run_data_sample: runDataObj
        ? Object.fromEntries(Object.entries(runDataObj).slice(0, 20))
        : runDataFull,
    }, { status: 502 })
  }

  // Run succeeded — fetch and process dataset
  const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?limit=${job.requested_limit}`
  console.log(`[import-apify/sync] fetching dataset: ${datasetUrl}`)

  await updateApifyImportJob(supabase, id, { status: 'processing', apify_dataset_id: defaultDatasetId })

  let rawItems: ApifyItem[]
  try {
    const itemsRes = await fetch(`${datasetUrl}&token=${token}`)
    console.log(`[import-apify/sync] dataset response status: ${itemsRes.status}`)

    if (!itemsRes.ok) {
      const errText = await itemsRes.text()
      await updateApifyImportJob(supabase, id, {
        status: 'failed',
        error_message: `Dataset fetch falhou: ${itemsRes.status} — ${errText.slice(0, 200)}`,
        finished_at: new Date().toISOString(),
      })
      return NextResponse.json({
        error: 'Falha ao buscar dataset',
        dataset_url: datasetUrl,
        dataset_status: itemsRes.status,
        dataset_body: errText.slice(0, 500),
      }, { status: 502 })
    }
    rawItems = await itemsRes.json() as ApifyItem[]
    console.log(`[import-apify/sync] dataset items count: ${rawItems.length}`)
    if (rawItems[0]) {
      console.log(`[import-apify/sync] first item keys: ${Object.keys(rawItems[0]).join(', ')}`)
    }
  } catch (err) {
    await updateApifyImportJob(supabase, id, {
      status: 'failed',
      error_message: `Erro ao buscar dataset: ${String(err)}`,
      finished_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: 'Falha ao buscar dataset', detail: String(err) }, { status: 502 })
  }

  console.log(`[import-apify/sync] dataset: ${rawItems.length} itens`)

  let imported = 0, skippedDuplicate = 0, invalid = 0
  let emailFound = 0, websiteOnly = 0, manualReview = 0

  for (const item of rawItems) {
    const companyName = item.title?.trim() ?? ''
    if (!companyName) { invalid++; continue }

    const email = item.emails?.[0]?.trim() || null
    const website = item.website?.trim() || null
    const phone = item.phone?.trim() || null
    const itemCity = item.city?.trim() || null
    const state = item.state?.trim() || null
    const placeId = item.placeId?.trim() || null

    if (placeId) {
      const ex = await findGlobalLeadByProviderExternalId(supabase, 'apify', placeId)
      if (ex) { skippedDuplicate++; continue }
    }

    if (website) {
      const ex = await findGlobalLeadByWebsite(supabase, website)
      if (ex) { skippedDuplicate++; continue }
    }

    if (companyName && itemCity) {
      const ex = await findGlobalLeadByNameAndCity(supabase, companyName, itemCity)
      if (ex) { skippedDuplicate++; continue }
    }

    const qualityStatus = classifyLeadQuality({ email, website })

    const created = await createGlobalLead(supabase, {
      company_name: companyName,
      email,
      website,
      phone,
      city: itemCity,
      state,
      category_id: job.category_id,
      provider_source: 'apify',
      provider_external_id: placeId,
      lead_quality_status: qualityStatus,
    })

    if (created) {
      imported++
      if (qualityStatus === 'email_found') emailFound++
      else if (qualityStatus === 'website_only') websiteOnly++
      else manualReview++
    }
  }

  await updateApifyImportJob(supabase, id, {
    status: 'succeeded',
    apify_dataset_id: defaultDatasetId,
    imported_count: imported,
    skipped_duplicate_count: skippedDuplicate,
    email_found_count: emailFound,
    website_only_count: websiteOnly,
    manual_review_count: manualReview,
    invalid_count: invalid,
    finished_at: new Date().toISOString(),
  })

  console.log(`[import-apify/sync] concluído — importados: ${imported}, duplicatas: ${skippedDuplicate}`)

  const firstItem = rawItems[0] as Record<string, unknown> | undefined

  return NextResponse.json({
    message: 'Sincronização concluída',
    summary: { imported, skipped_duplicate: skippedDuplicate, email_found: emailFound, website_only: websiteOnly, manual_review: manualReview, invalid },
    debug: {
      dataset_id: defaultDatasetId,
      dataset_url: datasetUrl,
      items_fetched: rawItems.length,
      first_item_keys: firstItem ? Object.keys(firstItem) : [],
      first_item_sample: firstItem
        ? Object.fromEntries(
            Object.entries(firstItem).filter(([k]) => /email|title|website|phone|city|state|place/i.test(k))
          )
        : null,
    },
  })
}
