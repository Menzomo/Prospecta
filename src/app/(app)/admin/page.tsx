import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getGlobalLeadsForAdmin,
  getCategoriesForAdmin,
  getUsersForAdmin,
  getLeadStatsByCategory,
  getStockByCategory,
  getStockByUserAndCategory,
  getGmailRequests,
} from '@/repositories/adminRepository'
import { AdminGlobalLeads } from '@/features/admin/components/AdminGlobalLeads'
import { AdminCategories } from '@/features/admin/components/AdminCategories'
import { AdminUsers } from '@/features/admin/components/AdminUsers'
import { AdminNichoOverview } from '@/features/admin/components/AdminNichoOverview'
import { getManualReviewQueue, getLeadQualityOverview } from '@/repositories/leadQualityRepository'
import { AdminManualReviewQueue } from '@/features/admin/components/AdminManualReviewQueue'
import { AdminLeadQualityOverview } from '@/features/admin/components/AdminLeadQualityOverview'
import { AdminStockOverview } from '@/features/admin/components/AdminStockOverview'
import { AdminUserStockOverview } from '@/features/admin/components/AdminUserStockOverview'
import { AdminGmailRequests } from '@/features/admin/components/AdminGmailRequests'

type SearchParams = Promise<{ category?: string; city?: string; reviewNiche?: string }>

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: categoryFilter = '', city: cityFilter = '', reviewNiche = '' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Load categories first to resolve slug → id for filtering
  const categories = await getCategoriesForAdmin(supabase)
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
  const activeCategoryId = categoryFilter
    ? (categoryBySlug.get(categoryFilter)?.id ?? undefined)
    : undefined
  const reviewNicheCategoryId = reviewNiche
    ? (categoryBySlug.get(reviewNiche)?.id ?? undefined)
    : undefined

  const [leads, users, reviewQueue, overview, nichoStats, stock, userStock, gmailRequests] = await Promise.all([
    getGlobalLeadsForAdmin(supabase, {
      categoryId: activeCategoryId,
      city: cityFilter || undefined,
    }),
    getUsersForAdmin(supabase),
    getManualReviewQueue(supabase, reviewNicheCategoryId),
    getLeadQualityOverview(supabase),
    getLeadStatsByCategory(supabase),
    getStockByCategory(supabase),
    getStockByUserAndCategory(supabase),
    getGmailRequests(supabase),
  ])

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Admin — Prospecta</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/import-apify"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Importar via Apify
            </Link>
            <Link
              href="/admin/import"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import Manual
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-10">
          {/* Solicitações Gmail */}
          <AdminGmailRequests requests={gmailRequests} />

          {/* Overview geral */}
          <AdminLeadQualityOverview overview={overview} />

          {/* Estoque por nicho */}
          <AdminStockOverview stock={stock} categories={categories} />

          {/* Estoque por usuário e nicho */}
          <AdminUserStockOverview stock={userStock} categories={categories} />

          {/* Resumo por nicho */}
          <AdminNichoOverview stats={nichoStats} categories={categories} />

          {/* Leads sem Email */}
          <AdminManualReviewQueue
            leads={reviewQueue}
            categories={categories}
            activeNiche={reviewNiche}
            categoryFilter={categoryFilter}
            cityFilter={cityFilter}
          />

          {/* Global Leads com filtros */}
          <AdminGlobalLeads
            leads={leads}
            categories={categories}
            categoryFilter={categoryFilter}
            cityFilter={cityFilter}
          />

          <AdminCategories categories={categories} />
          <AdminUsers users={users} />
        </div>
      </main>
    </>
  )
}
