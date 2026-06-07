import Link from 'next/link'
import { dismissNoReplyFollowupAction } from '@/features/followups/actions'
import type { NextFollowup } from '../services/dashboardService'

type Props = {
  followups: NextFollowup[]
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

export function NextFollowups({ followups }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Acompanhamentos</h2>

      {followups.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum acompanhamento pendente.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {followups.map((f) => {
            const overdue = new Date(f.due_at) < new Date()
            const isNoReply = f.type === 'no_reply'
            const isNoReplyOverdue = isNoReply && overdue

            const badgeLabel = isNoReplyOverdue ? 'Sem resposta' : isNoReply ? 'Aguardando' : 'Manual'
            const badgeClass = isNoReplyOverdue
              ? 'bg-amber-100 text-amber-700'
              : isNoReply
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'

            const description = isNoReplyOverdue
              ? 'Sem resposta ao último email'
              : isNoReply
              ? `Aguardando até ${formatDateTime(f.due_at)}`
              : f.title

            return (
              <div
                key={f.id}
                className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                  {badgeLabel}
                </span>

                <Link
                  href={`/leads/${f.lead_id}`}
                  className="truncate text-sm font-semibold text-gray-900 hover:underline"
                >
                  {f.company_name}
                </Link>

                <p className="line-clamp-2 text-xs text-gray-500">{description}</p>

                {!isNoReply && (
                  <p className={`text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-400'}`}>
                    {overdue ? 'Atrasado · ' : ''}{formatDateTime(f.due_at)}
                  </p>
                )}

                {isNoReplyOverdue && (
                  <>
                    <p className="text-xs font-medium text-red-500">
                      Atrasado · {formatDateTime(f.due_at)}
                    </p>
                    <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-200 pt-2">
                      <Link
                        href={`/leads/${f.lead_id}/send`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Enviar novo email
                      </Link>
                      <form action={dismissNoReplyFollowupAction.bind(null, f.id, f.lead_id)}>
                        <button
                          type="submit"
                          className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                        >
                          Esquecer lead
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
