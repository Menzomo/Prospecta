'use client'

import { useState } from 'react'
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

function ChevronLeft({ faded }: { faded: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={faded ? 'text-gray-300' : 'text-gray-400'}
    >
      <path
        d="M11 14L7 9l4-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRight({ faded }: { faded: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={faded ? 'text-gray-300' : 'text-gray-400'}
    >
      <path
        d="M7 4l4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NextFollowups({ followups }: Props) {
  const [index, setIndex] = useState(0)
  const total = followups.length

  const f = total > 0 ? followups[Math.min(index, total - 1)] : null
  const overdue = f ? new Date(f.due_at) < new Date() : false
  const isNoReply = f?.type === 'no_reply'
  const isNoReplyOverdue = isNoReply && overdue

  const badgeLabel = isNoReplyOverdue ? 'Sem resposta' : isNoReply ? 'Aguardando' : 'Manual'
  const badgeClass = isNoReplyOverdue
    ? 'bg-amber-100 text-amber-700'
    : isNoReply
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-500'

  const description = f
    ? isNoReplyOverdue
      ? 'Sem resposta ao último email'
      : isNoReply
      ? `Aguardando até ${formatDateTime(f.due_at)}`
      : f.title
    : ''

  const atFirst = index === 0
  const atLast = index === total - 1

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">Acompanhamentos</h2>
        {total > 1 && (
          <span className="text-xs text-gray-400">{index + 1} de {total}</span>
        )}
      </div>

      {/* Body */}
      {!f ? (
        <div className="flex flex-col items-center gap-1 px-5 py-6 text-center">
          <p className="text-sm font-medium text-gray-500">Nenhum acompanhamento pendente</p>
          <p className="text-xs text-gray-400">Crie acompanhamentos a partir da página de um lead.</p>
        </div>
      ) : (
        <div className="flex min-h-[9rem] items-stretch">
          {/* Left arrow area */}
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={atFirst || total <= 1}
            aria-label="Anterior"
            className="flex w-10 shrink-0 items-center justify-center rounded-bl-xl border-r border-gray-100 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            {total > 1 && <ChevronLeft faded={atFirst} />}
          </button>

          {/* Card content */}
          <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
            <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
              {badgeLabel}
            </span>

            <Link
              href={`/leads/${f.lead_id}`}
              className="mt-2 block truncate text-sm font-semibold text-gray-900 hover:underline"
            >
              {f.company_name}
            </Link>

            <p className="mt-1 text-xs text-gray-500">{description}</p>

            {!isNoReply && (
              <p className={`mt-0.5 text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-400'}`}>
                {overdue ? 'Atrasado · ' : ''}{formatDateTime(f.due_at)}
              </p>
            )}

            {isNoReplyOverdue && (
              <>
                <p className="mt-0.5 text-xs font-medium text-red-500">
                  Atrasado · {formatDateTime(f.due_at)}
                </p>
                <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
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

          {/* Right arrow area */}
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={atLast || total <= 1}
            aria-label="Próximo"
            className="flex w-10 shrink-0 items-center justify-center rounded-br-xl border-l border-gray-100 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            {total > 1 && <ChevronRight faded={atLast} />}
          </button>
        </div>
      )}
    </div>
  )
}
