import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateToken } from '@/services/callService'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await generateToken(supabase, user.id)

  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  return Response.json(result.data)
}
