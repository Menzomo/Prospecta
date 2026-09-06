import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateProfileSubscription } from '@/repositories/profileRepository'
import { closeUserAccount } from '@/services/subscriptionService'
import { alertBillingError } from '@/services/asaasService'

export const dynamic = 'force-dynamic'

const DISABLE_AFTER_DAYS = 7
const CLOSE_AFTER_DAYS = 14

/**
 * Carência de inadimplência: 7 dias vencido → desativa (bloqueia canWrite,
 * mantém login e número reservado). +7 dias (14 total) → encerra de vez
 * (mesmo fluxo de "Encerrar conta"). NUNCA toca subscription_source
 * diferente de 'asaas' — contas liberadas manualmente pelo admin (pagas por
 * fora) são intocáveis por essa automação.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const adminSupabase = createAdminClient()

  const { data: rows, error } = await adminSupabase
    .from('profiles')
    .select('id, subscription_status, payment_overdue_since, asaas_subscription_id')
    .eq('subscription_source', 'asaas')
    .not('payment_overdue_since', 'is', null)

  if (error) {
    console.error('[cron/check-overdue-subscriptions] falha ao buscar perfis', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  let disabled = 0
  let closed = 0
  let errors = 0

  for (const row of rows ?? []) {
    if (!row.payment_overdue_since) continue
    const daysOverdue = (Date.now() - new Date(row.payment_overdue_since).getTime()) / 86_400_000

    try {
      if (daysOverdue >= CLOSE_AFTER_DAYS) {
        await closeUserAccount(adminSupabase, row.id, {
          asaasSubscriptionId: row.asaas_subscription_id,
          requireAsaasCancelSuccess: false,
        })
        closed++
      } else if (daysOverdue >= DISABLE_AFTER_DAYS && row.subscription_status === 'active') {
        await updateProfileSubscription(adminSupabase, row.id, { subscription_status: 'overdue' })
        disabled++
      }
    } catch (err) {
      console.error('[cron/check-overdue-subscriptions] falha ao processar', row.id, err)
      await alertBillingError(`cron carência (userId=${row.id})`, err)
      errors++
    }
  }

  console.log('[cron/check-overdue-subscriptions] completed', {
    checked: rows?.length ?? 0,
    disabled,
    closed,
    errors,
  })

  return Response.json({ ok: true, checked: rows?.length ?? 0, disabled, closed, errors })
}
