'use client'

import { useState, useTransition, useEffect } from 'react'
import type { EmailMessage, EmailThread } from '@/types/email'
import { markSingleReplyAsReadAction } from '@/features/inbox/actions'

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
  const [isPending, startTransition] = useTransition()

  // Optimistic: track IDs marked as read this session; seed with already-read messages
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(messages.filter((m) => m.is_read).map((m) => m.id))
  )

  const allInbound = messages.filter((m) => m.direction === 'inbound')
  const unread = allInbound
    .filter((m) => !readIds.has(m.id))
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())

  // Auto-close modal when all replies are marked as read during this session
  useEffect(() => {
    if (open && unread.length === 0) {
      setOpen(false)
    }
  }, [open, unread.length])

  function handleMarkRead(messageId: string) {
    setReadIds((prev) => new Set([...prev, messageId]))
    startTransition(async () => {
      await markSingleReplyAsReadAction(messageId)
    })
  }

  if (unread.length === 0) {
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
          {unread.length}
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
                  {unread.length}
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
                {unread.map((reply) => {
                  const gmailUrl = buildGmailUrl(reply, threads)
                  return (
                    <div key={reply.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-800">Lead respondeu ao email</p>
                        <p className="text-xs text-gray-500">{formatDateTime(reply.sent_at)}</p>
                        {reply.subject && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            Assunto: {reply.subject}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {gmailUrl ? (
                          <a
                            href={gmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            Abrir no Gmail
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Link do Gmail indisponível</span>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleMarkRead(reply.id)}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          Marcar como lida
                        </button>
                      </div>
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
