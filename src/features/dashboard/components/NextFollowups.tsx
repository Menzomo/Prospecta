import Link from 'next/link'
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
            return (
              <Link
                key={f.id}
                href={`/leads/${f.lead_id}`}
                className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 hover:opacity-70"
              >
                <span className="text-sm font-medium text-gray-800">{f.company_name}</span>
                <span className="text-xs text-gray-500">{f.title}</span>
                <span className={`text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-400'}`}>
                  {overdue ? 'Atrasado · ' : ''}{formatDateTime(f.due_at)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
