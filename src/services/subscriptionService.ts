// Fechamento de conta compartilhado — chamado tanto pelo botão self-service
// (closeAccountAction) quanto pelo cron de carência (check-overdue-subscriptions).
// Sempre a mesma sequência: cancela na Asaas (se houver) → libera número
// Telnyx → subscription_status='canceled' (bloqueia login) → mata sessões.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { cancelAsaasSubscription, refundAsaasPayment, alertBillingError } from './asaasService'
import { updateProfileSubscription } from '@/repositories/profileRepository'

/**
 * @param opts.requireAsaasCancelSuccess Self-service (usuário vendo a tela,
 *   pode tentar de novo): true — se cancelar falhar, joga o erro pra cima e
 *   NÃO faz mais nada (não libera número, não desativa). Cron automático
 *   (já vencido há 14 dias, ninguém olhando): false — loga/alerta e segue
 *   liberando o número mesmo assim, não vale travar a limpeza por uma falha
 *   pontual da API.
 */
export async function closeUserAccount(
  adminSupabase: SupabaseClient<Database>,
  userId: string,
  opts: {
    asaasSubscriptionId?: string | null
    refundPaymentId?: string | null
    requireAsaasCancelSuccess: boolean
  }
): Promise<void> {
  if (opts.refundPaymentId) {
    try {
      await refundAsaasPayment(opts.refundPaymentId)
    } catch (err) {
      console.error('[closeUserAccount] falha ao reembolsar', err)
      await alertBillingError(`reembolso no encerramento (userId=${userId})`, err)
      // Não interrompe por falha de reembolso — melhor encerrar e resolver
      // o reembolso manualmente do que travar o usuário no meio do caminho.
    }
  }

  if (opts.asaasSubscriptionId) {
    try {
      await cancelAsaasSubscription(opts.asaasSubscriptionId)
    } catch (err) {
      console.error('[closeUserAccount] falha ao cancelar na Asaas', err)
      await alertBillingError(`cancelar assinatura no encerramento (userId=${userId})`, err)
      if (opts.requireAsaasCancelSuccess) throw err
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any).rpc('release_telnyx_number', { p_user_id: userId })

  await updateProfileSubscription(adminSupabase, userId, {
    subscription_status: 'canceled',
    payment_overdue_since: null,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any).rpc('enforce_session_limit', { p_user_id: userId, p_max_sessions: 0 })
}
