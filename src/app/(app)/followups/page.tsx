import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingFollowupsByUserId } from '@/repositories/followupRepository'
import { completeFollowupAction } from '@/features/followups/actions'
import { PageHeader } from '@/components/layout/PageHeader'

function formatDueAt(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date()
}

export default async function FollowupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const followups = await getPendingFollowupsByUserId(supabase, user.id)

  return (
    <main className="flex flex-col p-6">
      <PageHeader
        title="Acompanhamentos"
        subtitle="Follow-ups pendentes da sua base de leads"
        actions={
          <Link href="/leads" className="text-sm text-on-surface-muted hover:text-on-surface">
            ← Leads
          </Link>
        }
      />

      <div className="flex justify-center">
        <div className="w-full max-w-lg">
          {followups.length === 0 ? (
            <div className="rounded-xl border border-outline bg-surface-container p-8 text-center shadow-card">
              <p className="text-sm font-medium text-on-surface">Nenhum acompanhamento pendente.</p>
              <p className="mt-1 text-sm text-on-surface-muted">
                Crie acompanhamentos a partir da página de um lead.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {followups.map((followup) => {
                const overdue = isOverdue(followup.due_at)
                const leadName =
                  followup.leads?.company_name ??
                  (followup.user_leads?.global_leads as { company_name?: string } | null)?.company_name ??
                  'Lead'
                const leadHref = followup.lead_id
                  ? `/leads/${followup.lead_id}`
                  : `/leads/global/${followup.user_lead_id}`

                return (
                  <div
                    key={followup.id}
                    className="rounded-xl border border-outline bg-surface-container p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={leadHref}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {leadName}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {followup.title}
                          </p>
                          {followup.type === 'no_reply' ? (
                            overdue ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Sem resposta
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Aguardando
                              </span>
                            )
                          ) : (
                            <span className="shrink-0 rounded-full bg-surface-low px-2 py-0.5 text-xs text-on-surface-muted">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className={`mt-0.5 text-xs ${overdue ? 'font-medium text-red-500' : 'text-on-surface-muted'}`}>
                          {overdue ? 'Atrasado · ' : ''}{formatDueAt(followup.due_at)}
                        </p>
                        {followup.notes && (
                          <p className="mt-1 text-xs text-on-surface-muted">{followup.notes}</p>
                        )}
                      </div>

                      <form
                        action={completeFollowupAction.bind(
                          null,
                          followup.id,
                          followup.lead_id,
                          followup.user_lead_id ?? null
                        )}
                      >
                        <button
                          type="submit"
                          className="shrink-0 cursor-pointer rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Concluir
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
