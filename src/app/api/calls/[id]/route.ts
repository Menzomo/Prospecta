import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCallById } from '@/repositories/callRepository'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const call = await getCallById(supabase, id, user.id)
  if (!call) return Response.json({ error: 'Chamada não encontrada.' }, { status: 404 })

  return Response.json({ call })
}
