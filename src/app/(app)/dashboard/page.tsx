import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getDashboardData } from '@/features/dashboard/services/dashboardService'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'
import { RecentReplies } from '@/features/dashboard/components/RecentReplies'
import { FollowUpList } from '@/features/dashboard/components/FollowUpList'
import { DateRangeFilter } from '@/features/dashboard/components/DateRangeFilter'
import { PageHeader } from '@/components/layout/PageHeader'

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
    <main className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Visão Geral de Performance"
        subtitle={`${company.company_name} · Prospecção comercial`}
        actions={<DateRangeFilter />}
      />

      <DashboardKpis kpis={dashboard.kpis} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 2/3 — Atividade Recente */}
        <div className="xl:col-span-2">
          <RecentReplies replies={dashboard.recentReplies} />
        </div>

        {/* 1/3 — Follow-ups */}
        <div className="xl:col-span-1">
          <FollowUpList followups={dashboard.nextFollowups} />
        </div>
      </div>
    </main>
  )
}
