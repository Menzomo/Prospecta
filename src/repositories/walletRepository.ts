// Repositório da wallet — todas as operações financeiras passam por aqui.
// Débito e crédito SEMPRE usam adminSupabase (service role) — as RPCs são SECURITY DEFINER.
// getBalance e getTransactions podem usar o client do usuário (RLS cobre a leitura).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<Database> | SupabaseClient<any>

export type WalletTransaction = {
  id: string
  user_id: string
  type: string
  amount: number
  balance_after: number
  reference_id: string | null
  description: string | null
  created_at: string
}

/**
 * Debita um valor da wallet via RPC atômica (SELECT FOR UPDATE + ledger write).
 * Lança exceção se saldo insuficiente.
 * Deve ser chamado com adminSupabase.
 */
export async function debitWallet(
  supabase: AnyClient,
  userId: string,
  amount: number,
  type: 'call' | 'analysis' | 'leads_purchase',
  referenceId: string,
  description: string
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('debit_wallet', {
    p_user_id:      userId,
    p_amount:       amount,
    p_type:         type,
    p_reference_id: referenceId,
    p_description:  description,
  })

  if (error) throw new Error(error.message)
  return Number(data)
}

/**
 * Credita um valor na wallet via RPC atômica (upsert + ledger write).
 * Deve ser chamado com adminSupabase.
 */
export async function creditWallet(
  supabase: AnyClient,
  userId: string,
  amount: number,
  type: 'recharge' | 'bonus' | 'welcome',
  referenceId: string | null,
  description: string
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('credit_wallet', {
    p_user_id:      userId,
    p_amount:       amount,
    p_type:         type,
    p_reference_id: referenceId,
    p_description:  description,
  })

  if (error) throw new Error(error.message)
  return Number(data)
}

/**
 * Retorna o saldo atual do usuário.
 * Pode ser chamado com supabase do usuário (RLS cobre SELECT).
 * Retorna 0 se a wallet ainda não foi criada.
 */
export async function getBalance(
  supabase: AnyClient,
  userId: string
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('wallet_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[walletRepository.getBalance]', error.message)
    return 0
  }
  return data ? Number(data.balance) : 0
}

/**
 * Retorna as transações mais recentes do usuário.
 * Pode ser chamado com supabase do usuário.
 */
export async function getTransactions(
  supabase: AnyClient,
  userId: string,
  limit = 20
): Promise<WalletTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[walletRepository.getTransactions]', error.message)
    return []
  }
  return (data ?? []) as WalletTransaction[]
}
