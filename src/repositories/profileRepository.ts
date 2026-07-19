import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Profile } from '@/types/auth'

/**
 * Contas isentas de checagem de saldo/assinatura (env var compartilhada entre
 * ligações e o gate de escrita do CRM). Não confundir com profiles.role='admin',
 * que controla acesso ao painel /admin — são dois conceitos diferentes.
 */
export function isAdminUser(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return adminIds.includes(userId)
}

/**
 * Libera ações de escrita do CRM (criar template, buscar/adicionar lead,
 * mandar email, ligar, etc.) — true pra admins ou assinatura ativa.
 */
export async function hasActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  if (isAdminUser(userId)) return true
  const profile = await getProfileById(supabase, userId)
  return profile?.subscription_status === 'active'
}

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

export async function upsertProfile(
  supabase: SupabaseClient<Database>,
  profile: Database['public']['Tables']['profiles']['Insert']
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) return null
  return data
}

/**
 * Atualiza campos de assinatura — chamado pelo webhook do Asaas e pela
 * atribuição manual de número Telnyx (admin). Deve ser chamado com adminSupabase.
 */
export async function updateProfileSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: Partial<{
    subscription_status: 'inactive' | 'active' | 'canceled'
    subscription_source: 'asaas' | 'manual' | 'beta_grandfather'
    asaas_customer_id: string
    asaas_subscription_id: string
    subscription_paid_at: string
  }>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)

  if (error) {
    console.error('[profileRepository.updateProfileSubscription]', error.message)
    return false
  }
  return true
}
