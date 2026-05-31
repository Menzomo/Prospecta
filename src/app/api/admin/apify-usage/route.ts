import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ApifyPlan = {
  id?: string
  usageLevel?: number
  maxActorMemoryGbytes?: number
}

type ApifyUserData = {
  username?: string
  email?: string
  plan?: ApifyPlan
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

  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${token}`, {
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return NextResponse.json({ available: false, reason: `Apify retornou ${res.status}` })
    }

    const body = await res.json() as { data?: ApifyUserData }
    const data = body.data

    if (!data) {
      return NextResponse.json({ available: false, reason: 'Resposta inesperada da Apify' })
    }

    const plan = data.plan
    const usagePct = typeof plan?.usageLevel === 'number'
      ? Math.round(plan.usageLevel * 100)
      : null

    return NextResponse.json({
      available: true,
      username: data.username ?? null,
      plan_id: plan?.id ?? null,
      usage_pct: usagePct,
      consulted_at: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ available: false, reason: 'Falha ao consultar Apify' })
  }
}
