import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInboundMessagesWithLeads } from '@/repositories/emailRepository'
import { stripHtmlPreview } from '@/utils/stripHtml'
import { PageHeader } from '@/components/layout/PageHeader'

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
    <main className="flex flex-col p-6">
      <PageHeader title="Inbox" subtitle="Respostas recebidas dos seus leads" />

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-on-surface-muted">Nenhuma resposta recebida ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline bg-surface-container shadow-card">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1
            return (
              <Link
                key={message.id}
                href={message.lead_id ? `/leads/${message.lead_id}` : `/leads/global/${message.user_lead_id}`}
                className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-low ${
                  !isLast ? 'border-b border-outline' : ''
                } ${!message.is_read ? 'bg-blue-50/60 hover:bg-blue-50' : ''}`}
              >
                <div className="mt-1 shrink-0">
                  {!message.is_read ? (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-outline" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-sm ${!message.is_read ? 'font-semibold text-on-surface' : 'font-medium text-on-surface'}`}>
                      {message.lead_company_name || '—'}
                      {message.lead_contact_name && (
                        <span className="ml-1.5 font-normal text-on-surface-muted">
                          · {message.lead_contact_name}
                        </span>
                      )}
                    </p>
                    <p className="shrink-0 text-xs text-on-surface-muted">
                      {formatDateTime(message.sent_at)}
                    </p>
                  </div>

                  <p className={`mt-0.5 truncate text-sm ${!message.is_read ? 'font-medium text-on-surface' : 'text-on-surface-muted'}`}>
                    {message.subject}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-on-surface-muted">
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
  )
}
