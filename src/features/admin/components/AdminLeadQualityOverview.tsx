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
  const metrics: Metric[] = [
    { label: 'Email Found', value: overview.email_found, color: 'text-green-700 bg-green-50' },
    { label: 'Website Only', value: overview.website_only, color: 'text-blue-700 bg-blue-50' },
    { label: 'Manual Review', value: overview.manual_review, color: 'text-yellow-700 bg-yellow-50' },
    { label: 'Invalid', value: overview.invalid, color: 'text-red-700 bg-red-50' },
  ]

  const total = metrics.reduce((sum, m) => sum + m.value, 0)

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Lead Quality Overview{' '}
        <span className="text-sm font-normal text-gray-400">({total} total)</span>
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-gray-200 bg-white px-4 py-4"
          >
            <p className="text-xs font-medium text-gray-500">{metric.label}</p>
            <p className={`mt-1 text-2xl font-bold ${metric.color.split(' ')[0]}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
