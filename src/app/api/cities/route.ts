import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchCities } from '@/repositories/cityRepository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''

  if (q.length < 2) {
    return Response.json({ cities: [] })
  }

  const cities = await searchCities(supabase, q)
  return Response.json({ cities })
}
