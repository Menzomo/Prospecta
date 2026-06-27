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
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: call } = await supabase
    .from('calls')
    .select('recording_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!call?.recording_url) {
    return Response.json({ error: 'Recording not found' }, { status: 404 })
  }

  const { data: signed } = await supabase.storage
    .from('call-recordings')
    .createSignedUrl(call.recording_url, 3600)

  if (!signed?.signedUrl) {
    return Response.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return Response.json({ url: signed.signedUrl })
}
