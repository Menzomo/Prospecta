'use client'

import Link from 'next/link'
import { dismissNoReplyFollowupAction, sendNewEmailFromNoReplyAction } from '@/features/followups/actions'
import type { NextFollowup } from '../services/dashboardService'

type Props = {
  followups: NextFollowup[]
  canWrite?: boolean
}

const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function parseDueAt(timestamp: string) {
  const d = new Date(timestamp)
  return {
    day: d.getDate(),
    month: MONTH_ABBR[d.getMonth()],
    time: d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function FollowUpList({ followups, canWrite = true }: Props) {
  if (followups.length === 0) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container shadow-card">
        <div className="border-b border-outline px-5 py-4">
          <h2 className="text-sm font-semibold text-on-surface font-[--font-heading]">Próximos Follow-ups</h2>
        </div>
        <div className="flex flex-col items-center gap-1 px-5 py-8 text-center">
          <p className="text-sm font-medium text-on-surface-muted">Nenhum follow-up pendente</p>
          <p className="text-xs text-on-surface-muted/60">Crie acompanhamentos a partir da página de um lead.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-outline bg-surface-container shadow-card">
      <div className="flex items-center justify-between border-b border-outline px-5 py-4">
        <h2 className="text-sm font-semibold text-on-surface font-[--font-heading]">Próximos Follow-ups</h2>
        <span className="rounded-full bg-surface-low px-2 py-0.5 text-xs font-medium text-on-surface-muted">
          {followups.length}
        </span>
      </div>

      <ul className="divide-y divide-outline overflow-y-auto" style={{ maxHeight: '22rem' }}>
        {followups.map((f) => {
          const overdue = new Date(f.due_at) < new Date()
          const isNoReply = f.type === 'no_reply'
          const isNoReplyOverdue = isNoReply && overdue
          const { day, month, time } = parseDueAt(f.due_at)
          const leadHref = f.lead_id ? `/leads/${f.lead_id}` : `/leads/global/${f.user_lead_id}`

          return (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3.5">
              {/* Date bubble */}
              <div className={`flex shrink-0 flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[2.75rem] text-center ${
                overdue ? 'bg-red-50 border border-red-200' : 'bg-surface-low border border-outline'
              }`}>
                <span className={`text-lg font-bold leading-none font-[--font-heading] ${overdue ? 'text-red-600' : 'text-on-surface'}`}>
                  {day}
                </span>
                <span className={`text-[10px] font-medium uppercase tracking-wide ${overdue ? 'text-red-500' : 'text-on-surface-muted'}`}>
                  {month}
                </span>
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-on-surface-muted">{time}</span>
                  {overdue && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-label="Atrasado" />
                  )}
                </div>
                <Link
                  href={leadHref}
                  className="truncate text-sm font-semibold text-on-surface hover:text-primary transition-colors"
                >
                  {f.company_name}
                </Link>
                <p className="text-xs text-on-surface-muted truncate">
                  {isNoReply ? 'Sem resposta ao último email' : f.title}
                </p>

                {isNoReplyOverdue && canWrite && (
                  <div className="mt-1 flex items-center gap-2">
                    <form action={sendNewEmailFromNoReplyAction.bind(null, f.id, f.lead_id, f.user_lead_id ?? null)}>
                      <button
                        type="submit"
                        className="cursor-pointer text-xs font-medium text-primary hover:underline"
                      >
                        Enviar email
                      </button>
                    </form>
                    <span className="text-xs text-on-surface-muted/40">·</span>
                    <form action={dismissNoReplyFollowupAction.bind(null, f.id, f.lead_id, f.user_lead_id ?? null)}>
                      <button
                        type="submit"
                        className="cursor-pointer text-xs text-on-surface-muted hover:text-on-surface transition-colors"
                      >
                        Ignorar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
