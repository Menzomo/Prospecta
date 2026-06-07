import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { logoutAction } from '@/features/auth/actions'
import { getDashboardData } from '@/features/dashboard/services/dashboardService'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'
import { RecentReplies } from '@/features/dashboard/components/RecentReplies'
import { NextFollowups } from '@/features/dashboard/components/NextFollowups'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const company = await getCompanyProfileByUserId(supabase, user.id)
  if (!company) {
    redirect('/onboarding')
  }

  const dashboard = await getDashboardData(supabase, user.id)

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{company.company_name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          <p className="mt-0.5 text-sm text-gray-500">Visão geral da sua prospecção</p>
        </div>

        <DashboardKpis kpis={dashboard.kpis} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentReplies replies={dashboard.recentReplies} />
          <NextFollowups followups={dashboard.nextFollowups} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/leads"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Ver todos os leads
          </Link>
          <Link
            href="/followups"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Ver followups
          </Link>
        </div>
      </main>
    </>
  )
}
