import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchSchema } from '@/features/search/validations/searchSchema'
import { executeLeadSearch } from '@/features/search/services/searchService'
import { getLeadCategoryByName } from '@/repositories/leadCategoryRepository'
import { findCity } from '@/repositories/cityRepository'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const validation = searchSchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: 'Dados inválidos', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { category, city, state } = validation.data

  const [existingCategory, existingCity] = await Promise.all([
    getLeadCategoryByName(supabase, category),
    findCity(supabase, city, state),
  ])

  if (!existingCategory) {
    return Response.json(
      { error: 'Categoria inválida. Selecione uma categoria da lista.' },
      { status: 400 }
    )
  }

  if (!existingCity) {
    return Response.json(
      { error: 'Cidade inválida. Selecione uma cidade da lista.' },
      { status: 400 }
    )
  }

  try {
    const result = await executeLeadSearch(supabase, user.id, category, city, state)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/search/leads] Error:', message)
    return Response.json({ error: 'Erro na busca. Tente novamente.' }, { status: 500 })
  }
}
