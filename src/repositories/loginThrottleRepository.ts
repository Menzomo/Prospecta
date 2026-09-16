import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type ThrottleCheck = { locked: boolean; retryAfterSeconds: number }

/**
 * Throttle de tentativas de login por e-mail (5 erradas em 15min → bloqueia
 * por 15min) — ver migration 20260915000000_login_throttle.sql pra regra
 * completa. Lógica atômica em Postgres (RPCs), chamada sempre com o admin
 * client — as funções só têm EXECUTE liberado pro service role.
 *
 * RPCs não são tipadas em src/lib/supabase/types.ts (Functions: never) —
 * mesmo padrão de cast já usado em enforce_session_limit/debitWallet.
 */

export async function checkLoginThrottle(
  adminSupabase: SupabaseClient<Database>,
  email: string
): Promise<ThrottleCheck> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any).rpc('check_login_throttle', { p_email: email })

  if (error) {
    console.error('[loginThrottleRepository.checkLoginThrottle]', error.message)
    // Falha no throttle nunca deve impedir login legítimo — só não protege
    // dessa vez (mesmo princípio do enforce_session_limit em loginAction).
    return { locked: false, retryAfterSeconds: 0 }
  }

  const row = data?.[0]
  return { locked: row?.locked ?? false, retryAfterSeconds: row?.retry_after_seconds ?? 0 }
}

export async function recordFailedLogin(adminSupabase: SupabaseClient<Database>, email: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any).rpc('record_failed_login', { p_email: email })
  if (error) console.error('[loginThrottleRepository.recordFailedLogin]', error.message)
}

export async function clearLoginThrottle(adminSupabase: SupabaseClient<Database>, email: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any).rpc('clear_login_throttle', { p_email: email })
  if (error) console.error('[loginThrottleRepository.clearLoginThrottle]', error.message)
}
