'use client'

import { useState } from 'react'
import type { EmailMessage, EmailThread } from '@/types/email'

type Props = {
  messages: EmailMessage[]
  threads: EmailThread[]
}

function buildGmailUrl(message: EmailMessage, threads: EmailThread[]): string {
  const thread = threads.find((t) => t.id === message.thread_id)
  if (thread?.gmail_thread_id) {
    return `https://mail.google.com/mail/#all/${thread.gmail_thread_id}`
  }
  return '/inbox'
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

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function LeadRepliesButton({ messages, threads }: Props) {
  const [open, setOpen] = useState(false)

  const replies = messages
    .filter((m) => m.direction === 'inbound')
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())

  if (replies.length === 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-400">
        <BellIcon />
        Sem respostas
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        <BellIcon className="text-blue-600" />
        Respostas recebidas
        <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
          {replies.length}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <BellIcon className="text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Respostas recebidas</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {replies.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <XIcon />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {replies.map((reply) => {
                  const gmailUrl = buildGmailUrl(reply, threads)
                  const isExternal = gmailUrl.startsWith('http')
                  return (
                    <div key={reply.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">Lead respondeu ao email</p>
                        <p className="text-xs text-gray-500">{formatDateTime(reply.sent_at)}</p>
                        {reply.subject && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            Assunto: {reply.subject}
                          </p>
                        )}
                      </div>
                      <a
                        href={gmailUrl}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Abrir no Gmail
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
