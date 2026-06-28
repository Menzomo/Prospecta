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

  const hasConversions = kpis.convertedByEmail > 0 || kpis.convertedByPhone > 0

  return (
    <div className="flex flex-col gap-4">
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
          note={kpis.interestedLeads === 0 ? 'Continue prospectando' : undefined}
        />
      </div>

      {hasConversions && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
            Conversões
          </p>
          <div className="grid grid-cols-2 gap-4">
            {kpis.convertedByEmail > 0 && (
              <KpiCard
                label="Convertidos via Email"
                value={kpis.convertedByEmail}
                badge={{ label: '📧 EMAIL', variant: 'success' }}
              />
            )}
            {kpis.convertedByPhone > 0 && (
              <KpiCard
                label="Convertidos via Telefonia"
                value={kpis.convertedByPhone}
                badge={{ label: '📞 TELEFONIA', variant: 'success' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
