import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getGlobalLeadsForAdmin,
  getCategoriesForAdmin,
  getUsersForAdmin,
} from '@/repositories/adminRepository'
import { AdminGlobalLeads } from '@/features/admin/components/AdminGlobalLeads'
import { AdminCategories } from '@/features/admin/components/AdminCategories'
import { AdminUsers } from '@/features/admin/components/AdminUsers'
import { getManualReviewQueue, getLeadQualityOverview } from '@/repositories/leadQualityRepository'
import { AdminManualReviewQueue } from '@/features/admin/components/AdminManualReviewQueue'
import { AdminLeadQualityOverview } from '@/features/admin/components/AdminLeadQualityOverview'

export default async function AdminPage() {
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

  const [leads, categories, users, reviewQueue, overview] = await Promise.all([
    getGlobalLeadsForAdmin(supabase),
    getCategoriesForAdmin(supabase),
    getUsersForAdmin(supabase),
    getManualReviewQueue(supabase),
    getLeadQualityOverview(supabase),
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
          <AdminLeadQualityOverview overview={overview} />
          <AdminManualReviewQueue leads={reviewQueue} />
          <AdminGlobalLeads leads={leads} />
          <AdminCategories categories={categories} />
          <AdminUsers users={users} />
        </div>
      </main>
    </>
  )
}
