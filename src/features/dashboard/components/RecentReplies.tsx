import Link from 'next/link'
import type { RecentReply } from '../services/dashboardService'

type Props = {
  replies: RecentReply[]
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentReplies({ replies }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Últimas respostas</h2>

      {replies.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma resposta recebida ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {replies.map((reply) => (
            <Link
              key={reply.id}
              href={`/leads/${reply.lead_id}`}
              className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 hover:opacity-70"
            >
              <span className="text-sm font-medium text-gray-800">{reply.lead_company_name}</span>
              <span className="truncate text-xs text-gray-500">{reply.subject}</span>
              <span className="text-xs text-gray-400">{formatDateTime(reply.sent_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
