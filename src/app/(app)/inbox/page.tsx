import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInboundMessagesWithLeads } from '@/repositories/emailRepository'
import { stripHtmlPreview } from '@/utils/stripHtml'

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const messages = await getInboundMessagesWithLeads(supabase, user.id)

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
      </header>

      <main className="flex flex-1 flex-col p-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">Nenhuma resposta recebida ainda.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1
              return (
                <Link
                  key={message.id}
                  href={`/leads/${message.lead_id}`}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ${
                    !isLast ? 'border-b border-gray-100' : ''
                  } ${!message.is_read ? 'bg-blue-50 hover:bg-blue-50/80' : ''}`}
                >
                  <div className="mt-1 shrink-0">
                    {!message.is_read ? (
                      <span className="block h-2 w-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-gray-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${!message.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {message.lead_company_name || '—'}
                        {message.lead_contact_name && (
                          <span className="ml-1.5 font-normal text-gray-500">
                            · {message.lead_contact_name}
                          </span>
                        )}
                      </p>
                      <p className="shrink-0 text-xs text-gray-400">
                        {formatDateTime(message.sent_at)}
                      </p>
                    </div>

                    <p className={`mt-0.5 truncate text-sm ${!message.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {message.subject}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {message.from_email && (
                        <span className="mr-1.5">{message.from_email} ·</span>
                      )}
                      {stripHtmlPreview(message.body)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
