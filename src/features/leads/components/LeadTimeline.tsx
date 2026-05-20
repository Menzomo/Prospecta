import type { Lead } from '@/types/leads'
import type { EmailMessage } from '@/types/email'
import type { Followup } from '@/types/followups'
import { stripHtml, stripHtmlPreview } from '@/utils/stripHtml'

type LeadCreatedEvent = {
  id: string
  type: 'lead_created'
  timestamp: string
}

type EmailSentEvent = {
  id: string
  type: 'email_sent'
  timestamp: string
  subject: string
}

type FollowupCreatedEvent = {
  id: string
  type: 'followup_created'
  timestamp: string
  title: string
  due_at: string
}

type FollowupCompletedEvent = {
  id: string
  type: 'followup_completed'
  timestamp: string
  title: string
}

type ReplyReceivedEvent = {
  id: string
  type: 'reply_received'
  timestamp: string
  subject: string
  from_email: string | null
  body: string
  original_body: string | null
}

type TimelineEvent =
  | LeadCreatedEvent
  | EmailSentEvent
  | FollowupCreatedEvent
  | FollowupCompletedEvent
  | ReplyReceivedEvent

function buildTimeline(
  lead: Lead,
  messages: EmailMessage[],
  followups: Followup[]
): TimelineEvent[] {
  const outboundByThread = new Map<string, EmailMessage>()
  for (const m of messages) {
    if (m.direction === 'outbound') {
      outboundByThread.set(m.thread_id, m)
    }
  }

  const events: TimelineEvent[] = [
    {
      id: `created_${lead.id}`,
      type: 'lead_created',
      timestamp: lead.created_at,
    },
    ...messages
      .filter((m) => m.direction === 'outbound')
      .map((m): EmailSentEvent => ({
        id: m.id,
        type: 'email_sent',
        timestamp: m.sent_at,
        subject: m.subject,
      })),
    ...messages
      .filter((m) => m.direction === 'inbound')
      .map((m): ReplyReceivedEvent => {
        const related = outboundByThread.get(m.thread_id)
        return {
          id: `reply_${m.id}`,
          type: 'reply_received',
          timestamp: m.sent_at,
          subject: m.subject,
          from_email: m.from_email,
          body: stripHtml(m.body),
          original_body: related ? stripHtmlPreview(related.body, 200) : null,
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
  ]

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type Props = {
  lead: Lead
  messages: EmailMessage[]
  followups: Followup[]
}

export function LeadTimeline({ lead, messages, followups }: Props) {
  const events = buildTimeline(lead, messages, followups)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-gray-900">Histórico</h2>

      <div className="flex flex-col">
        {events.map((event, index) => {
          const isLast = index === events.length - 1

          return (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-400" />
                {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                {event.type === 'lead_created' && (
                  <>
                    <p className="text-sm font-medium text-gray-800">Lead criado</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>
                  </>
                )}

                {event.type === 'email_sent' && (
                  <>
                    <p className="text-sm font-medium text-gray-800">Email enviado</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      Assunto: {event.subject}
                    </p>
                  </>
                )}

                {event.type === 'followup_created' && (
                  <>
                    <p className="text-sm font-medium text-gray-800">Acompanhamento criado</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      Data prevista: {formatDate(event.due_at)}
                    </p>
                  </>
                )}

                {event.type === 'followup_completed' && (
                  <>
                    <p className="text-sm font-medium text-gray-800">Acompanhamento concluído</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>
                    <p className="mt-1 text-xs text-gray-500">{event.title}</p>
                  </>
                )}

                {event.type === 'reply_received' && (
                  <>
                    <p className="text-sm font-medium text-gray-800">Resposta recebida</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>

                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {event.from_email && <p>De: {event.from_email}</p>}
                      <p>Assunto: {event.subject}</p>
                    </div>

                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                        {event.body || '(sem conteúdo)'}
                      </p>
                    </div>

                    {event.original_body && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400">Email original:</p>
                        <p className="mt-0.5 line-clamp-3 text-xs italic text-gray-400">
                          {event.original_body}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
