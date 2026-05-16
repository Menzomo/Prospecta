import type { Lead } from '@/types/leads'
import type { EmailMessage } from '@/types/email'

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

type TimelineEvent = LeadCreatedEvent | EmailSentEvent

function buildTimeline(lead: Lead, messages: EmailMessage[]): TimelineEvent[] {
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

type Props = {
  lead: Lead
  messages: EmailMessage[]
}

export function LeadTimeline({ lead, messages }: Props) {
  const events = buildTimeline(lead, messages)

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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
