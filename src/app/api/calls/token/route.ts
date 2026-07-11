import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateToken } from '@/services/callService'
import { getBalance } from '@/repositories/walletRepository'

export const dynamic = 'force-dynamic'

// Saldo mínimo para iniciar uma ligação (equivale a 1 minuto de chamada)
const SALDO_MINIMO = 0.15

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Admins são isentos de verificação de saldo
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const isAdmin  = adminIds.includes(user.id)

  if (!isAdmin) {
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
