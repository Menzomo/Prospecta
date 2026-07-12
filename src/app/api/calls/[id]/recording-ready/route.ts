import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ready: false }, { status: 401 })

  const { data } = await supabase
    .from('calls')
    .select('recording_url, recording_sid')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return Response.json({
    ready:          !!data?.recording_url,
    hasRecordingSid: !!data?.recording_sid,
  })
}
