import type { DashboardKpis } from '../services/dashboardService'
import { KpiCard } from './KpiCard'

type Props = {
  kpis: DashboardKpis
}

export function DashboardKpis({ kpis }: Props) {
  const taxaResposta =
    kpis.sentEmails > 0
      ? Math.round((kpis.receivedReplies / kpis.sentEmails) * 100)
      : 0

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label="Total de Leads"
        value={kpis.totalLeads.toLocaleString('pt-BR')}
        note="Leads ativos na sua base"
      />
      <KpiCard
        label="Emails Enviados"
        value={kpis.sentEmails.toLocaleString('pt-BR')}
        note="Total de emails disparados"
      />
      <KpiCard
        label="Taxa de Resposta"
        value={`${taxaResposta}%`}
        badge={
          taxaResposta >= 20
            ? { label: 'TOP TIER', variant: 'success' }
            : taxaResposta >= 10
            ? { label: 'ACIMA DA MÉDIA', variant: 'info' }
            : undefined
        }
        note={taxaResposta === 0 && kpis.sentEmails === 0 ? 'Nenhum email enviado ainda' : undefined}
      />
      <KpiCard
        label="Acompanhamentos Pendentes"
        value={kpis.pendingFollowups}
        urgency={kpis.pendingFollowups > 0}
        note={kpis.pendingFollowups === 0 ? 'Tudo em dia' : undefined}
      />
      <KpiCard
        label="Leads Interessados"
        value={kpis.interestedLeads}
        badge={
          kpis.interestedLeads > 0
            ? { label: 'CONVERTIDOS', variant: 'success' }
            : undefined
        }
        note={kpis.interestedLeads === 0 ? 'Continue prospectando' : undefined}
      />
    </div>
  )
}
