import type { LeadQualityOverview } from '@/repositories/leadQualityRepository'

interface Props {
  overview: LeadQualityOverview
}

type Metric = {
  label: string
  value: number
  color: string
}

export function AdminLeadQualityOverview({ overview }: Props) {
  const pipelineMetrics: Metric[] = [
    { label: 'Ativos', value: overview.active, color: 'text-green-700' },
    { label: 'Revisão', value: overview.pending_review, color: 'text-yellow-700' },
    { label: 'Enriquecimento', value: overview.pending_enrichment, color: 'text-blue-700' },
    { label: 'Rejeitados', value: overview.rejected, color: 'text-red-700' },
  ]

  const qualityMetrics: Metric[] = [
    { label: 'Completos', value: overview.complete, color: 'text-green-700' },
    { label: 'Só email', value: overview.email_only, color: 'text-blue-700' },
    { label: 'Só telefone', value: overview.phone_only, color: 'text-purple-700' },
    { label: 'Incompletos', value: overview.incomplete, color: 'text-red-700' },
  ]

  const total = overview.active + overview.pending_review + overview.pending_enrichment + overview.rejected

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">
        Pipeline de Leads{' '}
        <span className="text-sm font-normal text-gray-400">({total} total)</span>
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {pipelineMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-gray-200 bg-white px-4 py-4"
          >
            <p className="text-xs font-medium text-gray-500">{metric.label}</p>
            <p className={`mt-1 text-2xl font-bold ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-medium text-gray-500 mt-2">Qualidade dos leads ativos</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {qualityMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <p className="text-xs font-medium text-gray-400">{metric.label}</p>
            <p className={`mt-1 text-xl font-bold ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
