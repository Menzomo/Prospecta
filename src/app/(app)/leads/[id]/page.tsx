import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadById } from '@/repositories/leadRepository'
import { getEmailMessagesByLeadId, getEmailThreadsByLeadId } from '@/repositories/emailRepository'
import { getFollowupsByLeadId } from '@/repositories/followupRepository'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { getCallsWithAnalysisByLeadId } from '@/repositories/callRepository'
import { hideLeadAction } from '@/features/leads/actions'
import { LeadEditForm } from '@/features/leads/components/LeadEditForm'
import { LeadTimeline } from '@/features/leads/components/LeadTimeline'
import { LeadRepliesButton } from '@/features/leads/components/LeadRepliesButton'
import { LeadFollowupSection } from '@/features/followups/components/LeadFollowupSection'
import { CallButton } from '@/features/calls/components/CallButton'
import { LeadCallsSection } from '@/features/calls/components/LeadCallsSection'
import { LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Props = {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const lead = await getLeadById(supabase, id)
  if (!lead) notFound()

  const [emailMessages, followups, emailThreads, telephonySettings, calls] = await Promise.all([
    getEmailMessagesByLeadId(supabase, user.id, id),
    getFollowupsByLeadId(supabase, user.id, id),
    getEmailThreadsByLeadId(supabase, user.id, id),
    getTelephonySettings(supabase, user.id),
    getCallsWithAnalysisByLeadId(supabase, user.id, id),
  ])

  const status = lead.status as LeadStatus
  const statusLabel = LEAD_STATUS_LABELS[status] ?? lead.status

  return (
    <>
      <header className="border-b border-outline bg-surface-container px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/leads" className="text-sm text-on-surface-muted hover:text-on-surface">
              ← Leads
            </Link>
            <span className="text-outline">/</span>
            <h1 className="text-lg font-semibold text-on-surface font-[--font-heading]">{lead.company_name}</h1>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-2">
            <LeadRepliesButton messages={emailMessages} threads={emailThreads} leadId={lead.id} />
            <CallButton
              phone={lead.phone ?? null}
              hasSettings={telephonySettings !== null}
              companyName={lead.company_name}
              leadId={lead.id}
            />
            <Link
              href={`/leads/${lead.id}/send`}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Enviar email
            </Link>
            <form action={hideLeadAction.bind(null, lead.id)}>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                Ocultar lead
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-muted">Status atual</p>
                <p className="mt-0.5 font-medium text-on-surface">{statusLabel}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-muted">Fonte</p>
                <p className="mt-0.5 text-sm text-on-surface-muted capitalize">{lead.source}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-muted">Cadastrado em</p>
                <p className="mt-0.5 text-sm text-on-surface-muted">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-on-surface font-[--font-heading]">Editar dados</h2>
            <LeadEditForm lead={lead} />
          </div>

          <LeadFollowupSection leadId={lead.id} followups={followups} />

          <LeadCallsSection calls={calls} leadId={lead.id} />

          <LeadTimeline lead={lead} messages={emailMessages} followups={followups} threads={emailThreads} calls={calls} />
        </div>
      </main>
    </>
  )
}
