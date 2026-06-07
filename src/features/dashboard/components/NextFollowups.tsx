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

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Acompanhamentos</h2>

        {total > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Anterior"
            >
              <ChevronLeft />
            </button>
            <span className="min-w-12 text-center text-xs text-gray-400">
              {index + 1} de {total}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              disabled={index === total - 1}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próximo"
            >
              <ChevronRight />
            </button>
          </div>
        )}
      </div>

      {!f ? (
        <p className="text-sm text-gray-400">Nenhum acompanhamento pendente.</p>
      ) : (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
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
              <div className="mt-3 flex items-center gap-3 border-t border-gray-200 pt-3">
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
      )}
    </div>
  )
}
