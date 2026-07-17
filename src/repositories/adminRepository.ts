import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type AdminGlobalLeadDetail = {
  id: string
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  category_id: string | null
  status: string
  lead_quality_status: string
  confidence_score: number
  provider_source: string | null
  created_at: string
  updated_at: string
}

export type AdminGlobalLead = {
  id: string
  company_name: string
  city: string | null
  state: string | null
  email: string | null
  status: string
  lead_quality_status: string
  category_id: string | null
  confidence_score: number
  created_at: string
}

export type NichoStats = {
  category_id: string | null
  total: number
  active: number
  pending_review: number
  pending_enrichment: number
  rejected: number
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  search_terms: string[]
}

export type AdminUser = {
  id: string
  email: string
  role: string
  created_at: string
}

export async function getGlobalLeadByIdForAdmin(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<AdminGlobalLeadDetail | null> {
  const { data, error } = await supabase
    .from('global_leads')
    .select(
      'id, company_name, email, website, phone, city, state, category_id, status, lead_quality_status, confidence_score, provider_source, created_at, updated_at'
    )
    .eq('id', id)
    .single()

  if (error) return null
  return data ?? null
}

export async function getGlobalLeadsForAdmin(
  supabase: SupabaseClient<Database>,
  filters?: { categoryId?: string; city?: string }
): Promise<AdminGlobalLead[]> {
  let query = supabase
    .from('global_leads')
    .select('id, company_name, city, state, email, status, lead_quality_status, category_id, confidence_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function getLeadStatsByCategory(
  supabase: SupabaseClient<Database>
): Promise<NichoStats[]> {
  const { data, error } = await supabase
    .from('global_leads')
    .select('category_id, status')

  if (error || !data) return []

  const statsMap = new Map<string | null, NichoStats>()

  for (const row of data) {
    const key = row.category_id
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        category_id: key,
        total: 0,
        active: 0,
        pending_review: 0,
        pending_enrichment: 0,
        rejected: 0,
      })
    }
    const stats = statsMap.get(key)!
    stats.total++
    if (row.status === 'active') stats.active++
    else if (row.status === 'pending_review') stats.pending_review++
    else if (row.status === 'pending_enrichment') stats.pending_enrichment++
    else if (row.status === 'rejected') stats.rejected++
  }

  return Array.from(statsMap.values()).sort((a, b) => b.total - a.total)
}

export async function getCategoriesForAdmin(
  supabase: SupabaseClient<Database>
): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('lead_categories')
    .select('id, name, slug, search_terms')
    .order('name', { ascending: true })

  if (error) return []
  return data ?? []
}

export type UserNichoStock = {
  user_id: string
  user_email: string
  category_id: string
  total_global: number
  consumed: number
  available: number
}

export async function getStockByUserAndCategory(
  supabase: SupabaseClient<Database>
): Promise<UserNichoStock[]> {
  const { data: globalLeads } = await supabase
    .from('global_leads')
    .select('id, category_id')
    .eq('status', 'active')
    .in('lead_quality_status', ['complete', 'email_only', 'phone_only'])

  if (!globalLeads || globalLeads.length === 0) return []

  const leadCategoryMap = new Map(globalLeads.map((gl) => [gl.id, gl.category_id]))

  const totalPerCategory = new Map<string, number>()
  for (const gl of globalLeads) {
    if (!gl.category_id) continue
    totalPerCategory.set(gl.category_id, (totalPerCategory.get(gl.category_id) ?? 0) + 1)
  }

  const { data: userLeads } = await supabase
    .from('user_leads')
    .select('user_id, global_lead_id')

  if (!userLeads || userLeads.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')

  const userEmailMap = new Map((profiles ?? []).map((p) => [p.id, p.email ?? p.id]))

  const consumedMap = new Map<string, number>()
  for (const ul of userLeads) {
    const catId = leadCategoryMap.get(ul.global_lead_id)
    if (!catId) continue
    const key = `${ul.user_id}:${catId}`
    consumedMap.set(key, (consumedMap.get(key) ?? 0) + 1)
  }

  const seen = new Set<string>()
  const results: UserNichoStock[] = []

  for (const ul of userLeads) {
    const catId = leadCategoryMap.get(ul.global_lead_id)
    if (!catId) continue
    const key = `${ul.user_id}:${catId}`
    if (seen.has(key)) continue
    seen.add(key)

    const consumed = consumedMap.get(key) ?? 0
    const total = totalPerCategory.get(catId) ?? 0
    results.push({
      user_id: ul.user_id,
      user_email: userEmailMap.get(ul.user_id) ?? ul.user_id,
      category_id: catId,
      total_global: total,
      consumed,
      available: Math.max(0, total - consumed),
    })
  }

  return results.sort((a, b) => a.available - b.available)
}

export type NichoStockStats = {
  category_id: string
  total_stock: number
  consumed: number
  available: number
}

export async function getStockByCategory(
  supabase: SupabaseClient<Database>
): Promise<NichoStockStats[]> {
  const { data: stockLeads } = await supabase
    .from('global_leads')
    .select('id, category_id')
    .eq('status', 'active')
    .in('lead_quality_status', ['complete', 'email_only', 'phone_only'])

  if (!stockLeads || stockLeads.length === 0) return []

  const { data: userLeadLinks } = await supabase
    .from('user_leads')
    .select('global_lead_id')

  const consumedIds = new Set((userLeadLinks ?? []).map((ul) => ul.global_lead_id))

  const map = new Map<string, NichoStockStats>()

  for (const lead of stockLeads) {
    if (!lead.category_id) continue
    if (!map.has(lead.category_id)) {
      map.set(lead.category_id, { category_id: lead.category_id, total_stock: 0, consumed: 0, available: 0 })
    }
    const stat = map.get(lead.category_id)!
    stat.total_stock++
    if (consumedIds.has(lead.id)) stat.consumed++
    else stat.available++
  }

  return Array.from(map.values())
}

export async function getUsersForAdmin(
  supabase: SupabaseClient<Database>
): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data ?? []
}

export type AdminGmailRequest = {
  id: string
  email: string
  full_name: string | null
  gmail_request_email: string
  gmail_requested_at: string | null
}

export async function getGmailRequests(
  supabase: SupabaseClient<Database>
): Promise<AdminGmailRequest[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, gmail_request_email, gmail_requested_at')
    .eq('gmail_request_status', 'pending')
    .order('gmail_requested_at', { ascending: true })

  if (error) return []
  return (data ?? []).filter((r) => r.gmail_request_email !== null) as AdminGmailRequest[]
}

export type AdminUserWallet = {
  user_id: string
  email: string
  balance: number
  updated_at: string | null
}

/**
 * Lista todos os usuários com seus saldos de carteira.
 * Requer cliente com service role (sem RLS) para ler wallet_balances de todos os usuários.
 */
export async function getAdminUserWallets(
  adminSupabase: SupabaseClient<Database>
): Promise<AdminUserWallet[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminSupabase as any
  const [{ data: profiles }, { data: balancesRaw }] = await Promise.all([
    adminSupabase.from('profiles').select('id, email').order('created_at', { ascending: false }),
    db.from('wallet_balances').select('user_id, balance, updated_at'),
  ])

  const balances = (balancesRaw ?? []) as { user_id: string; balance: string | number; updated_at: string | null }[]

  const balanceMap = new Map(
    balances.map((b) => [b.user_id, { balance: Number(b.balance), updated_at: b.updated_at }])
  )

  return (profiles ?? []).map((p) => ({
    user_id: p.id,
    email: p.email ?? '—',
    balance: balanceMap.get(p.id)?.balance ?? 0,
    updated_at: balanceMap.get(p.id)?.updated_at ?? null,
  })).sort((a, b) => b.balance - a.balance)
}

export type AdminTelnyxNumber = {
  id: string
  phone_number: string
  status: string
  user_id: string | null
  assigned_user_email: string | null
  created_at: string
}

/**
 * Lista o pool de números Telnyx (disponíveis + atribuídos), com email do
 * usuário atribuído resolvido via profiles (mesmo padrão de getAdminUserWallets).
 */
export async function getTelnyxNumberPool(
  adminSupabase: SupabaseClient<Database>
): Promise<AdminTelnyxNumber[]> {
  const [{ data: numbers }, { data: profiles }] = await Promise.all([
    adminSupabase
      .from('telnyx_numbers')
      .select('id, phone_number, status, user_id, created_at')
      .order('created_at', { ascending: false }),
    adminSupabase.from('profiles').select('id, email'),
  ])

  const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]))

  return (numbers ?? []).map((n) => ({
    id: n.id,
    phone_number: n.phone_number,
    status: n.status,
    user_id: n.user_id,
    assigned_user_email: n.user_id ? emailMap.get(n.user_id) ?? '—' : null,
    created_at: n.created_at,
  }))
}
