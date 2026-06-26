// Recebe resultado de análise de IA do n8n e consulta de status pelo browser.

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCallById } from '@/repositories/callRepository'
import { getCallAnalysisByCallId } from '@/repositories/callAnalysisRepository'

export const dynamic = 'force-dynamic'

const analysisResultSchema = z.object({
  transcript:               z.string().nullable().optional(),
  summary:                  z.string().nullable().optional(),
  key_points:               z.array(z.string()).nullable().optional(),
  objections:               z.array(z.string()).nullable().optional(),
  suggested_status:         z.string().nullable().optional(),
  suggested_followup_days:  z.number().int().nullable().optional(),
  suggested_followup_notes: z.string().nullable().optional(),
  ai_model:                 z.string().nullable().optional(),
  error_message:            z.string().nullable().optional(),
})

type Props = { params: Promise<{ id: string }> }

// POST — chamado pelo n8n com o resultado da análise
export async function POST(request: NextRequest, { params }: Props) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id: callId } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: 'Body inválido' }, { status: 400 }) }

  const validation = analysisResultSchema.safeParse(body)
  if (!validation.success) {
    return Response.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 422 })
  }

  const supabase = createAdminClient()

  const { data: call } = await supabase
    .from('calls')
    .select('user_id')
    .eq('id', callId)
    .single()
  if (!call) return Response.json({ error: 'Chamada não encontrada.' }, { status: 404 })

  const analysis = await getCallAnalysisByCallId(supabase, callId, call.user_id)
  if (!analysis) return Response.json({ error: 'Análise não registrada.' }, { status: 404 })

  const {
    transcript, summary, key_points, objections,
    suggested_status, suggested_followup_days, suggested_followup_notes,
    ai_model, error_message,
  } = validation.data

  const hasError = !!error_message
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('call_analyses')
    .update({
      status:                   hasError ? 'failed' : 'completed',
      transcript:               transcript ?? null,
      summary:                  summary ?? null,
      key_points:               key_points ?? null,
      objections:               objections ?? null,
      suggested_status:         suggested_status ?? null,
      suggested_followup_days:  suggested_followup_days ?? null,
      suggested_followup_notes: suggested_followup_notes ?? null,
      ai_model:                 ai_model ?? null,
      error_message:            error_message ?? null,
      processing_completed_at:  now,
    })
    .eq('id', analysis.id)

  if (error) {
    console.error('[calls/analysis POST]', error.message)
    return Response.json({ error: 'Falha ao salvar análise.' }, { status: 500 })
  }

  return Response.json({ ok: true, status: hasError ? 'failed' : 'completed' })
}

// GET — browser consulta o status da análise (polling pós-chamada)
export async function GET(_request: NextRequest, { params }: Props) {
  const { id: callId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const call = await getCallById(supabase, callId, user.id)
  if (!call) return Response.json({ error: 'Chamada não encontrada.' }, { status: 404 })

  const adminSupabase = createAdminClient()
  const analysis = await getCallAnalysisByCallId(adminSupabase, callId, user.id)

  return Response.json({ analysis: analysis ?? null })
}
