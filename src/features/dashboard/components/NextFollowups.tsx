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
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Próximos acompanhamentos</h2>

      {followups.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum acompanhamento pendente.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {followups.map((f) => {
            const overdue = new Date(f.due_at) < new Date()
            const isNoReply = f.type === 'no_reply'
            const isNoReplyOverdue = isNoReply && overdue

            return (
              <div key={f.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/leads/${f.lead_id}`}
                    className="text-sm font-medium text-gray-800 hover:opacity-70"
                  >
                    {f.company_name}
                  </Link>
                  {isNoReplyOverdue && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Sem resposta
                    </span>
                  )}
                </div>

                {isNoReply ? (
                  <span className="text-xs text-gray-500">
                    {isNoReplyOverdue
                      ? 'Sem resposta ao último email'
                      : `Aguardando resposta até ${formatDateTime(f.due_at)}`}
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">{f.title}</span>
                    <span className={`text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-400'}`}>
                      {overdue ? 'Atrasado · ' : ''}{formatDateTime(f.due_at)}
                    </span>
                  </>
                )}

                {isNoReplyOverdue && (
                  <>
                    <span className="text-xs font-medium text-red-500">
                      Atrasado · {formatDateTime(f.due_at)}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <Link
                        href={`/leads/${f.lead_id}/send`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Enviar novo email
                      </Link>
                      <span className="text-xs text-gray-300">·</span>
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
