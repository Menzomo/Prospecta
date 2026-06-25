import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestCallAnalysis } from '@/services/callService'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Props) {
  const { id: callId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await requestCallAnalysis(supabase, callId, user.id)

  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  return Response.json({ ok: true, analysis_id: result.analysisId })
}
