import type { DashboardKpis } from '../services/dashboardService'
import { KpiCard } from './KpiCard'

type Props = {
  kpis: DashboardKpis
}

export function DashboardKpis({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Total de leads" value={kpis.totalLeads} />
      <KpiCard label="Emails enviados" value={kpis.sentEmails} />
      <KpiCard label="Replies recebidas" value={kpis.receivedReplies} />
      <KpiCard label="Acompanhamentos pendentes" value={kpis.pendingFollowups} />
      <KpiCard label="Leads interessados" value={kpis.interestedLeads} />
    </div>
  )
}
