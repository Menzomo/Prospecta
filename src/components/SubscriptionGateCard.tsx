import Link from 'next/link'

type Props = {
  title?: string
  description?: string
  compact?: boolean
}

export function SubscriptionGateCard({
  title = 'Assinatura necessária',
  description = 'Assine o Prospecta pra liberar esta ação.',
  compact = false,
}: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-outline bg-surface-low px-3 py-2 text-xs text-on-surface-muted">
        <span>🔒</span>
        <span className="flex-1">{description}</span>
        <Link href="/settings?section=plano" className="shrink-0 font-medium text-primary hover:underline">
          Ver planos
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-6 text-center shadow-card">
      <p className="text-2xl">🔒</p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{title}</p>
      <p className="mt-1 text-sm text-on-surface-muted">{description}</p>
      <Link
        href="/settings?section=plano"
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Ver planos
      </Link>
    </div>
  )
}
