import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { getVisitsByDate, getUpcomingVisitDates } from '@/repositories/leadVisitRepository'
import { hasActiveSubscription } from '@/repositories/profileRepository'
import { PageHeader } from '@/components/layout/PageHeader'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'
import { VisitasBoard } from '@/features/visits/components/VisitasBoard'
import type { PickableLead } from '@/features/visits/components/VisitasBoard'

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export default async function VisitasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayIso()

  const [manualLeads, searchLeads, upcomingDates, canWrite] = await Promise.all([
    getLeadsByUserId(supabase, user.id),
    getUserLeadsWithGlobalData(supabase, user.id),
    getUpcomingVisitDates(supabase, user.id),
    hasActiveSubscription(supabase, user.id),
  ])

  // Um card/coluna por dia — hoje sempre aparece (mesmo vazio, pra ter onde
  // agendar) mais qualquer outro dia que já tenha visita planejada.
  const boardDates = [...new Set([today, ...upcomingDates])].sort()
  const visitsByDate = await Promise.all(boardDates.map((d) => getVisitsByDate(supabase, user.id, d)))
  const columns = boardDates.map((date, i) => ({ date, visits: visitsByDate[i] }))

  const pickableLeads: PickableLead[] = [
    ...manualLeads.map((l): PickableLead => ({
      key: `manual-${l.id}`,
      leadId: l.id,
      userLeadId: null,
      company_name: l.company_name,
      hasAddress: l.latitude != null && l.longitude != null,
    })),
    ...searchLeads.map((l): PickableLead => ({
      key: `search-${l.id}`,
      leadId: null,
      userLeadId: l.id,
      company_name: l.company_name,
      hasAddress: l.latitude != null && l.longitude != null,
    })),
  ]

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader
        title="Visitas"
        subtitle="Agende visitas presenciais e calcule a rota mais eficiente do dia"
      />

      {canWrite ? (
        <VisitasBoard today={today} columns={columns} pickableLeads={pickableLeads} />
      ) : (
        <SubscriptionGateCard description="Assine pra agendar visitas e calcular rotas." />
      )}
    </main>
  )
}
