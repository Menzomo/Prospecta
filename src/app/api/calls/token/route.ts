import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateToken } from '@/services/callService'
import { getBalance } from '@/repositories/walletRepository'
import { getProfileById } from '@/repositories/profileRepository'

export const dynamic = 'force-dynamic'

// Saldo mínimo para iniciar uma ligação (equivale a 1 minuto de chamada)
const SALDO_MINIMO = 0.20

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Admins são isentos de verificação de saldo e assinatura
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const isAdmin  = adminIds.includes(user.id)

  if (!isAdmin) {
    const profile = await getProfileById(supabase, user.id)
    if (profile?.subscription_status !== 'active') {
      return Response.json(
        { error: 'Assinatura necessária para fazer ligações. Acesse Configurações → Assinatura.', code: 'assinatura_necessaria' },
        { status: 402 }
      )
    }

    const balance = await getBalance(supabase, user.id)
    if (balance < SALDO_MINIMO) {
      return Response.json(
        { error: 'saldo_insuficiente', balance, minimo: SALDO_MINIMO },
        { status: 402 }
      )
    }
  }

  const result = await generateToken(supabase, user.id)

  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })

  return Response.json(result.data)
}
