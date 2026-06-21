import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import type { RecentReply } from '../services/dashboardService'

type Props = {
  replies: RecentReply[]
}

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays === 1) return 'há 1 dia'
  if (diffDays < 30) return `há ${diffDays} dias`
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  })
}

export function RecentReplies({ replies }: Props) {
  const unreadCount = replies.filter((r) => r.has_unread).length

  return (
    <div className="rounded-xl border border-outline bg-surface-container shadow-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-outline px-5 py-4">
        <h2 className="text-sm font-semibold text-on-surface font-[--font-heading]">Atividade Recente</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
            {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
          </span>
        )}
      </div>

      {replies.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-sm font-medium text-on-surface-muted">Nenhuma resposta recebida</p>
          <p className="text-xs text-on-surface-muted/60">Quando um lead responder, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="divide-y divide-outline">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-2.5 bg-surface-low">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Empresa</span>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Recebido</span>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Ação</span>
          </div>

          {replies.map((reply) => (
            <div
              key={reply.lead_id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 hover:bg-surface-low transition-colors"
            >
              {/* Company */}
              <div className="flex items-center gap-2.5 min-w-0">
                {reply.has_unread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-outline" />
                )}
                <Avatar name={reply.lead_company_name} size="sm" />
                <p className="truncate text-sm font-medium text-on-surface">{reply.lead_company_name}</p>
              </div>

              {/* Time */}
              <p className="text-xs text-on-surface-muted whitespace-nowrap">{formatRelativeTime(reply.last_reply_at)}</p>

              {/* Action */}
              <Link
                href={`/leads/${reply.lead_id}`}
                className="rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-low whitespace-nowrap"
              >
                Ver Lead
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
