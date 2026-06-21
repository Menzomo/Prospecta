'use client'

const FILTERS = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
] as const

export function DateRangeFilter() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-outline bg-surface-low p-1">
      {FILTERS.map((f, i) => (
        <button
          key={f.value}
          type="button"
          disabled
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            i === 2
              ? 'bg-surface-container text-on-surface shadow-sm'
              : 'text-on-surface-muted hover:text-on-surface'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
