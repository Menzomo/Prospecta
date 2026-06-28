import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingFollowupsByUserId } from '@/repositories/followupRepository'
import { completeFollowupAction } from '@/features/followups/actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'

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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const LEAD_STATUS_COLORS: Partial<Record<string, string>> = {
  new:            'bg-gray-100 text-gray-600',
  contacted:      'bg-blue-100 text-blue-700',
  interested:     'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-600',
  callback:       'bg-amber-100 text-amber-700',
  converted:      'bg-emerald-100 text-emerald-700',
  lost:           'bg-gray-100 text-gray-500',
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
        <div className="w-full max-w-2xl">
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
                const leadStatus = followup.leads?.status ?? null
                const leadHref = followup.lead_id
                  ? `/leads/${followup.lead_id}`
                  : `/leads/global/${followup.user_lead_id}`

                const initials = getInitials(leadName)
                const colorClass = avatarColor(leadName)
                const statusLabel = leadStatus && (LEAD_STATUS_LABELS as Record<string, string>)[leadStatus]
                const statusColor = (leadStatus && LEAD_STATUS_COLORS[leadStatus]) ?? 'bg-gray-100 text-gray-500'

                return (
                  <div
                    key={followup.id}
                    className="rounded-xl border border-outline bg-surface-container p-4 shadow-card"
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colorClass}`}>
                        {initials}
                      </div>

                      {/* Conteúdo */}
                      <div className="min-w-0 flex-1">
                        {/* Linha 1: nome + badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={leadHref}
                            className="text-sm font-semibold text-on-surface hover:text-primary hover:underline"
                          >
                            {leadName}
                          </Link>

                          {statusLabel && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          )}

                          {followup.type === 'no_reply' ? (
                            overdue ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Sem resposta
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Aguardando
                              </span>
                            )
                          ) : (
                            <span className="rounded-full bg-surface-low px-2 py-0.5 text-xs text-on-surface-muted">
                              Manual
                            </span>
                          )}
                        </div>

                        {/* Linha 2: título */}
                        <p className="mt-1 text-sm font-medium text-on-surface">{followup.title}</p>

                        {/* Linha 3: descrição completa */}
                        {followup.notes && (
                          <p className="mt-1 text-xs text-on-surface-muted">{followup.notes}</p>
                        )}

                        {/* Linha 4: data */}
                        <p className={`mt-1.5 text-xs ${overdue ? 'font-medium text-red-500' : 'text-on-surface-muted'}`}>
                          {overdue ? '⚠ Atrasado · ' : ''}{formatDueAt(followup.due_at)}
                        </p>
                      </div>

                      {/* Botão concluir */}
                      <form
                        action={completeFollowupAction.bind(
                          null,
                          followup.id,
                          followup.lead_id,
                          followup.user_lead_id ?? null
                        )}
                        className="shrink-0 self-start"
                      >
                        <button
                          type="submit"
                          className="cursor-pointer rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
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
