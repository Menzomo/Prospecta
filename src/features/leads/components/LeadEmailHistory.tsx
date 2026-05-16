import type { EmailMessage } from '@/types/email'

type Props = {
  messages: EmailMessage[]
}

export function LeadEmailHistory({ messages }: Props) {
  const outbound = messages.filter((m) => m.direction === 'outbound')

  if (outbound.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Emails enviados</h2>
        <p className="text-sm text-gray-500">Nenhum email enviado para este lead ainda.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        Emails enviados{' '}
        <span className="text-sm font-normal text-gray-400">({outbound.length})</span>
      </h2>

      <div className="flex flex-col gap-4">
        {outbound.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">{message.subject}</p>
              <time className="shrink-0 text-xs text-gray-400">
                {new Date(message.sent_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-600">{message.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
