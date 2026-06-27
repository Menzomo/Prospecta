'use client'

import { useState } from 'react'
import type { Lead } from '@/types/leads'
import type { EmailMessage, EmailThread } from '@/types/email'
import type { Followup } from '@/types/followups'
import type { CallWithAnalysis } from '@/types/calls'

type LeadCreatedEvent = { id: string; type: 'lead_created'; timestamp: string }
type EmailSentEvent = { id: string; type: 'email_sent'; timestamp: string; subject: string }
type FollowupCreatedEvent = { id: string; type: 'followup_created'; timestamp: string; title: string; due_at: string }
type FollowupCompletedEvent = { id: string; type: 'followup_completed'; timestamp: string; title: string }
type ReplyReceivedEvent = { id: string; type: 'reply_received'; timestamp: string; subject: string; gmail_url: string | null }
type CallCompletedEvent = { id: string; type: 'call_completed'; timestamp: string; duration_seconds: number | null; status: string }
type CallAnalyzedEvent = { id: string; type: 'call_analyzed'; timestamp: string }

type TimelineEvent =
  | LeadCreatedEvent
  | EmailSentEvent
  | FollowupCreatedEvent
  | FollowupCompletedEvent
  | ReplyReceivedEvent
  | CallCompletedEvent
  | CallAnalyzedEvent

const ENDED_STATUSES = ['completed', 'failed', 'no-answer', 'busy', 'canceled']

const CALL_STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída',
  failed: 'Falha',
  'no-answer': 'Sem resposta',
  busy: 'Ocupado',
  canceled: 'Cancelada',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}min ${s}s` : `${s}s`
}

function buildTimeline(
  lead: Lead,
  messages: EmailMessage[],
  followups: Followup[],
  threads: EmailThread[],
  calls: CallWithAnalysis[] = []
): TimelineEvent[] {
  const gmailIdMap = new Map(threads.map((t) => [t.id, t.gmail_thread_id]))

  const events: TimelineEvent[] = [
    { id: `created_${lead.id}`, type: 'lead_created', timestamp: lead.created_at },
    ...messages
      .filter((m) => m.direction === 'outbound')
      .map((m): EmailSentEvent => ({ id: m.id, type: 'email_sent', timestamp: m.sent_at, subject: m.subject })),
    ...messages
      .filter((m) => m.direction === 'inbound')
      .map((m): ReplyReceivedEvent => {
        const gmailThreadId = gmailIdMap.get(m.thread_id)
        return {
          id: `reply_${m.id}`,
          type: 'reply_received',
          timestamp: m.sent_at,
          subject: m.subject,
          gmail_url: gmailThreadId
            ? `https://mail.google.com/mail/#all/${gmailThreadId}`
            : null,
        }
      }),
    ...followups.map((f): FollowupCreatedEvent => ({
      id: `followup_created_${f.id}`,
      type: 'followup_created',
      timestamp: f.created_at,
      title: f.title,
      due_at: f.due_at,
    })),
    ...followups
      .filter((f) => f.status === 'completed' && f.completed_at)
      .map((f): FollowupCompletedEvent => ({
        id: `followup_completed_${f.id}`,
        type: 'followup_completed',
        timestamp: f.completed_at!,
        title: f.title,
      })),
    ...calls.flatMap((call): TimelineEvent[] => {
      const evts: TimelineEvent[] = []
      if (ENDED_STATUSES.includes(call.status)) {
        evts.push({
          id: `call_completed_${call.id}`,
          type: 'call_completed',
          timestamp: call.ended_at ?? call.created_at,
          duration_seconds: call.duration_seconds,
          status: call.status,
        })
      }
      const analysesArr = Array.isArray(call.call_analyses) ? call.call_analyses : call.call_analyses ? [call.call_analyses] : []
      const completedAnalysis = analysesArr.find(
        (a) => a.status === 'completed' && a.processing_completed_at
      )
      if (completedAnalysis?.processing_completed_at) {
        evts.push({
          id: `call_analyzed_${call.id}`,
          type: 'call_analyzed',
          timestamp: completedAnalysis.processing_completed_at,
        })
      }
      return evts
    }),
  ]

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function eventLabel(event: TimelineEvent): string {
  switch (event.type) {
    case 'lead_created': return 'Lead criado'
    case 'email_sent': return 'Email enviado'
    case 'reply_received': return 'Resposta recebida'
    case 'followup_created': return 'Acompanhamento criado'
    case 'followup_completed': return 'Acompanhamento concluído'
    case 'call_completed': return 'Ligação realizada'
    case 'call_analyzed': return 'Análise de IA disponível'
  }
}

type Props = {
  lead: Lead
  messages: EmailMessage[]
  followups: Followup[]
  threads: EmailThread[]
  calls?: CallWithAnalysis[]
}

export function LeadTimeline({ lead, messages, followups, threads, calls = [] }: Props) {
  const [expanded, setExpanded] = useState(false)
  const events = buildTimeline(lead, messages, followups, threads, calls)

  const lastEvent = events[0]
  const replyCount = events.filter((e) => e.type === 'reply_received').length

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Compact header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-900">
            Histórico
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {events.length}
            </span>
            {replyCount > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {replyCount} {replyCount === 1 ? 'resposta' : 'respostas'}
              </span>
            )}
          </span>
          {lastEvent && (
            <span className="text-xs text-gray-500">
              Último evento: {eventLabel(lastEvent)} · {formatDateTime(lastEvent.timestamp)}
            </span>
          )}
        </div>
        <span className="ml-4 shrink-0 text-xs font-medium text-blue-600">
          {expanded ? 'Fechar' : 'Ver histórico'}
        </span>
      </button>

      {/* Full timeline — collapsible */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="max-h-96 overflow-y-auto pr-1">
            <div className="flex flex-col">
              {events.map((event, index) => {
                const isLast = index === events.length - 1
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        event.type === 'reply_received' ? 'bg-blue-400'
                          : event.type === 'call_completed' ? 'bg-green-400'
                          : event.type === 'call_analyzed' ? 'bg-purple-400'
                          : 'bg-gray-300'
                      }`} />
                      {!isLast && <div className="mt-1 w-px flex-1 bg-gray-100" />}
                    </div>

                    <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                      {event.type === 'lead_created' && (
                        <>
                          <p className="text-sm font-medium text-gray-800">Lead criado</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                        </>
                      )}

                      {event.type === 'email_sent' && (
                        <>
                          <p className="text-sm font-medium text-gray-800">Email enviado</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">Assunto: {event.subject}</p>
                        </>
                      )}

                      {event.type === 'followup_created' && (
                        <>
                          <p className="text-sm font-medium text-gray-800">Acompanhamento criado</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{event.title}</p>
                          <p className="text-xs text-gray-400">Previsto: {formatDate(event.due_at)}</p>
                        </>
                      )}

                      {event.type === 'followup_completed' && (
                        <>
                          <p className="text-sm font-medium text-gray-800">Acompanhamento concluído</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{event.title}</p>
                        </>
                      )}

                      {event.type === 'reply_received' && (
                        <>
                          <p className="text-sm font-medium text-blue-700">Resposta recebida</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                          {event.subject && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">Assunto: {event.subject}</p>
                          )}
                          {event.gmail_url ? (
                            <a
                              href={event.gmail_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Abrir no Gmail →
                            </a>
                          ) : (
                            <span className="mt-1 inline-block text-xs text-gray-400">Link do Gmail indisponível</span>
                          )}
                        </>
                      )}

                      {event.type === 'call_completed' && (
                        <>
                          <p className="text-sm font-medium text-gray-800">
                            {event.status === 'completed'
                              ? 'Ligação realizada'
                              : `Ligação (${CALL_STATUS_LABELS[event.status] ?? event.status})`}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                          {event.duration_seconds != null && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              Duração: {formatDuration(event.duration_seconds)}
                            </p>
                          )}
                        </>
                      )}

                      {event.type === 'call_analyzed' && (
                        <>
                          <p className="text-sm font-medium text-purple-700">Análise de IA disponível</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.timestamp)}</p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
