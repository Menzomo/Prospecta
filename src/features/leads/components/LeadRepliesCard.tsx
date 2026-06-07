'use client'

import type { EmailMessage, EmailThread } from '@/types/email'

type Props = {
  messages: EmailMessage[]
  threads: EmailThread[]
}

function buildGmailUrl(message: EmailMessage, threads: EmailThread[]): string | null {
  const thread = threads.find((t) => t.id === message.thread_id)
  if (thread?.gmail_thread_id) {
    return `https://mail.google.com/mail/#all/${thread.gmail_thread_id}`
  }
  return null
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

export function LeadRepliesCard({ messages, threads }: Props) {
  const replies = messages
    .filter((m) => m.direction === 'inbound')
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())

  if (replies.length === 0) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-blue-600"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="text-sm font-semibold text-blue-800">Respostas recebidas</span>
        <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
          {replies.length}
        </span>
      </div>

      <div className="border-t border-blue-100 px-6 pb-4 pt-3 space-y-3">
        {replies.map((reply) => {
          const gmailUrl = buildGmailUrl(reply, threads)
          return (
            <div key={reply.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-blue-700">Lead respondeu ao email</p>
                <p className="text-xs text-gray-500">{formatDateTime(reply.sent_at)}</p>
                {reply.subject && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">Assunto: {reply.subject}</p>
                )}
              </div>
              {gmailUrl ? (
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  Abrir no Gmail
                </a>
              ) : (
                <span className="shrink-0 text-xs text-gray-400">Link do Gmail indisponível</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
