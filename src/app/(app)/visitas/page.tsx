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

  // Leads de busca têm nicho (category_id) — busca os nomes só das
  // categorias que aparecem aqui, pra agrupar o seletor de lead por nicho.
  const categoryIds = [...new Set(searchLeads.map((l) => l.category_id).filter((id): id is string => !!id))]
  const categoryNameById = new Map<string, string>()
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from('lead_categories')
      .select('id, name')
      .in('id', categoryIds)
    for (const c of categories ?? []) categoryNameById.set(c.id, c.name)
  }

  const pickableLeads: PickableLead[] = [
    ...manualLeads.map((l): PickableLead => ({
      key: `manual-${l.id}`,
      leadId: l.id,
      userLeadId: null,
      company_name: l.company_name,
      hasAddress: l.latitude != null && l.longitude != null,
      niche: null,
    })),
    ...searchLeads.map((l): PickableLead => ({
      key: `search-${l.id}`,
      leadId: null,
      userLeadId: l.id,
      company_name: l.company_name,
      hasAddress: l.latitude != null && l.longitude != null,
      niche: l.category_id ? categoryNameById.get(l.category_id) ?? null : null,
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
