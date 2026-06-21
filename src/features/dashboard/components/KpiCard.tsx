type BadgeVariant = 'success' | 'warning' | 'danger' | 'info'

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

type Props = {
  label: string
  value: number | string
  note?: string
  badge?: { label: string; variant: BadgeVariant }
  progress?: { value: number; label: string }
  urgency?: boolean
}

export function KpiCard({ label, value, note, badge, progress, urgency }: Props) {
  return (
    <div className="rounded-xl border border-outline bg-surface-container p-5 shadow-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-on-surface-muted uppercase tracking-wide">{label}</p>
        {urgency && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 mt-0.5" aria-label="Urgente" />
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-on-surface font-[--font-heading] leading-none">{value}</p>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASSES[badge.variant]}`}>
            {badge.label}
          </span>
        )}
      </div>

      {progress && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full rounded-full bg-surface-low overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-muted">{progress.label}</p>
        </div>
      )}

      {note && !progress && (
        <p className="text-xs text-on-surface-muted">{note}</p>
      )}
    </div>
  )
}
