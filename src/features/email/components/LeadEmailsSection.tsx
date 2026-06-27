'use client'

import { useState } from 'react'
import type { EmailMessage, EmailThread } from '@/types/email'

type Props = {
  messages: EmailMessage[]
  threads: EmailThread[]
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getGmailUrl(message: EmailMessage, threads: EmailThread[]): string | null {
  const thread = threads.find((t) => t.id === message.thread_id)
  if (thread?.gmail_thread_id) return `https://mail.google.com/mail/#all/${thread.gmail_thread_id}`
  return null
}

export function LeadEmailsSection({ messages, threads }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [idx, setIdx] = useState(0)

  const sorted = [...messages].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())

  if (sorted.length === 0) return null

  const total = sorted.length
  const current = sorted[idx]
  const isOutbound = current.direction === 'outbound'
  const gmailUrl = !isOutbound ? getGmailUrl(current, threads) : null

  return (
    <div className="rounded-xl border border-outline bg-surface-container shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-low"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-on-surface">
            Emails
            <span className="ml-2 rounded-full bg-surface-low px-2 py-0.5 text-xs font-medium text-on-surface-muted">
              {total}
            </span>
          </span>
          <span className="text-xs text-on-surface-muted">
            Último: {formatDateTime(sorted[0].sent_at)}
          </span>
        </div>
        <span className="ml-4 shrink-0 text-xs font-medium text-primary">
          {expanded ? 'Fechar' : 'Ver emails'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-outline px-6 py-4">
          {/* Carrossel navigation */}
          {total > 1 && (
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => setIdx((i) => i - 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-outline text-on-surface-muted transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Anterior"
              >
                ‹
              </button>
              <span className="text-xs text-on-surface-muted">
                {idx + 1} / {total}
              </span>
              <button
                type="button"
                disabled={idx === total - 1}
                onClick={() => setIdx((i) => i + 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-outline text-on-surface-muted transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Próximo"
              >
                ›
              </button>
            </div>
          )}

          {/* Email card */}
          <div className="rounded-lg border border-outline bg-surface p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isOutbound
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isOutbound ? 'Enviado' : 'Resposta recebida'}
                </span>
              </div>
              <span className="shrink-0 text-xs text-on-surface-muted">
                {formatDateTime(current.sent_at)}
              </span>
            </div>

            {current.subject && (
              <p className="mb-2 text-sm font-medium text-on-surface truncate">
                {current.subject}
              </p>
            )}

            {current.body && (
              <p className="mb-3 text-xs text-on-surface-muted line-clamp-3 whitespace-pre-wrap">
                {current.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
              </p>
            )}

            {!isOutbound && (
              <div className="flex items-center gap-2">
                {gmailUrl ? (
                  <a
                    href={gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Abrir no Gmail →
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-muted">Link do Gmail indisponível</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
