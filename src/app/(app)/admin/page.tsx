import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getGlobalLeadsForAdmin,
  getCategoriesForAdmin,
  getUsersForAdmin,
  getLeadStatsByCategory,
} from '@/repositories/adminRepository'
import { AdminGlobalLeads } from '@/features/admin/components/AdminGlobalLeads'
import { AdminCategories } from '@/features/admin/components/AdminCategories'
import { AdminUsers } from '@/features/admin/components/AdminUsers'
import { AdminNichoOverview } from '@/features/admin/components/AdminNichoOverview'
import { getManualReviewQueue, getLeadQualityOverview } from '@/repositories/leadQualityRepository'
import { AdminManualReviewQueue } from '@/features/admin/components/AdminManualReviewQueue'
import { AdminLeadQualityOverview } from '@/features/admin/components/AdminLeadQualityOverview'

type SearchParams = Promise<{ category?: string; city?: string }>

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: categoryFilter = '', city: cityFilter = '' } = await searchParams

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

  const [leads, users, reviewQueue, overview, nichoStats] = await Promise.all([
    getGlobalLeadsForAdmin(supabase, {
      categoryId: activeCategoryId,
      city: cityFilter || undefined,
    }),
    getUsersForAdmin(supabase),
    getManualReviewQueue(supabase),
    getLeadQualityOverview(supabase),
    getLeadStatsByCategory(supabase),
  ])

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Admin — Prospecta</h1>
          <Link
            href="/admin/import"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Importar Leads
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-10">
          {/* Overview geral */}
          <AdminLeadQualityOverview overview={overview} />

          {/* Resumo por nicho */}
          <AdminNichoOverview stats={nichoStats} categories={categories} />

          {/* Leads sem Email */}
          <AdminManualReviewQueue leads={reviewQueue} />

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
