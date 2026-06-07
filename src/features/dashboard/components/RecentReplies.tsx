import Link from 'next/link'
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

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function RecentReplies({ replies }: Props) {
  const unreadCount = replies.filter((r) => r.has_unread).length

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BellIcon />
        <h2 className="text-sm font-semibold text-gray-900">Respostas pendentes</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
          </span>
        )}
      </div>

      {replies.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <BellIcon />
          <p className="mt-1 text-sm font-medium text-gray-500">Nenhuma resposta recebida</p>
          <p className="text-xs text-gray-400">Quando um lead responder, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {replies.map((reply) => (
            <div key={reply.lead_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2">
                {reply.has_unread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Não lida" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gray-200" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{reply.lead_company_name}</p>
                  <p className="text-xs text-gray-400">{formatRelativeTime(reply.last_reply_at)}</p>
                </div>
              </div>
              <Link
                href={`/leads/${reply.lead_id}`}
                className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
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
