import type { CallsKpis } from '../services/dashboardService'
import { KpiCard } from './KpiCard'

type Props = {
  kpis: CallsKpis
}

export function CallsKpis({ kpis }: Props) {
  const creditsLeft = kpis.creditsTotal - kpis.creditsUsed
  const usagePercent = kpis.creditsTotal > 0
    ? Math.round((kpis.creditsUsed / kpis.creditsTotal) * 100)
    : 0

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
        Telefonia
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Ligações este mês"
          value={kpis.callsThisMonth.toLocaleString('pt-BR')}
          note={kpis.callsThisMonth === 0 ? 'Nenhuma chamada concluída ainda' : 'Chamadas concluídas no mês atual'}
          badge={
            kpis.callsThisMonth > 0
              ? { label: 'ATIVO', variant: 'success' }
              : undefined
          }
        />
        <KpiCard
          label="Créditos de Análise"
          value={`${creditsLeft} restantes`}
          progress={
            kpis.creditsTotal > 0
              ? {
                  value: 100 - usagePercent,
                  label: `${kpis.creditsUsed} de ${kpis.creditsTotal} usados neste período`,
                }
              : undefined
          }
          note={kpis.creditsTotal === 0 ? 'Nenhum crédito configurado para este período' : undefined}
          badge={
            kpis.creditsTotal > 0 && creditsLeft <= 2
              ? { label: 'BAIXO', variant: 'warning' }
              : undefined
          }
        />
      </div>
    </div>
  )
}
