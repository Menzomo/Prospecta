import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hideUserLeadAction, updateUserLeadStatusAction } from '@/features/leads/actions'
import { getFollowupsByUserLeadId } from '@/repositories/followupRepository'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { getCallsWithAnalysisByUserLeadId } from '@/repositories/callRepository'
import { hasActiveSubscription } from '@/repositories/profileRepository'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'
import { LeadFollowupSection } from '@/features/followups/components/LeadFollowupSection'
import { LeadCallsSection } from '@/features/calls/components/LeadCallsSection'
import { MarkInboxRead } from '@/features/inbox/components/MarkInboxRead'
import { CallButton } from '@/features/calls/components/CallButton'
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Props = {
  params: Promise<{ id: string }>
}

export default async function UserLeadDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user_lead (ownership enforced by RLS) joined with global_leads
  const { data, error } = await supabase
    .from('user_leads')
    .select('id, status, created_at, notes, global_leads(company_name, email, website, phone, city, state)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data || !data.global_leads) notFound()

  const gl = data.global_leads as unknown as {
    company_name: string
    email: string | null
    website: string | null
    phone: string | null
    city: string | null
    state: string | null
  }

  const [followups, telephonySettings, calls, canWrite] = await Promise.all([
    getFollowupsByUserLeadId(supabase, user.id, id),
    getTelephonySettings(supabase, user.id),
    getCallsWithAnalysisByUserLeadId(supabase, user.id, id),
    hasActiveSubscription(supabase, user.id),
  ])

  const status = data.status as LeadStatus
  const statusLabel = LEAD_STATUS_LABELS[status] ?? data.status

  return (
    <>
      <header className="border-b border-outline bg-surface-container px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/leads" className="text-sm text-on-surface-muted hover:text-on-surface">
              ← Leads
            </Link>
            <span className="text-outline">/</span>
            <h1 className="text-lg font-semibold text-on-surface font-[--font-heading]">{gl.company_name}</h1>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-2">
            <CallButton
              phone={gl.phone ?? null}
              hasSettings={telephonySettings !== null}
              companyName={gl.company_name}
              userLeadId={data.id}
            />
            {gl.email && (
              <Link
                href={`/leads/global/${id}/send`}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Enviar email
              </Link>
            )}
            {canWrite && (
              <form action={hideUserLeadAction.bind(null, id)}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  Ocultar lead
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Status bar */}
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-muted">Status atual</p>
                <div className="mt-1"><StatusBadge status={status} /></div>
              </div>
              <div>
                <p className="text-xs text-on-surface-muted">Fonte</p>
                <p className="mt-0.5 text-sm text-on-surface-muted">Busca</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-muted">Adicionado em</p>
                <p className="mt-0.5 text-sm text-on-surface-muted">
                  {new Date(data.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-on-surface font-[--font-heading]">Dados do lead</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-on-surface-muted">Empresa</dt>
                <dd className="font-medium text-on-surface">{gl.company_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-on-surface-muted">Email</dt>
                <dd className="text-primary">{gl.email ?? '—'}</dd>
              </div>
              {gl.phone && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-on-surface-muted">Telefone</dt>
                  <dd className="text-on-surface">{gl.phone}</dd>
                </div>
              )}
              {gl.website && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-on-surface-muted">Site</dt>
                  <dd className="truncate text-on-surface-muted">{gl.website}</dd>
                </div>
              )}
              {(gl.city || gl.state) && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-on-surface-muted">Cidade</dt>
                  <dd className="text-on-surface">
                    {[gl.city, gl.state].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Update status */}
          <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-on-surface font-[--font-heading]">Alterar status</h2>
            {canWrite ? (
              <form action={updateUserLeadStatusAction.bind(null, id)} className="flex gap-3">
                <select
                  name="status"
                  defaultValue={status}
                  className="flex-1 rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Salvar
                </button>
              </form>
            ) : (
              <SubscriptionGateCard compact description="Assine pra alterar o status do lead." />
            )}
          </div>

          {/* Followups */}
          <LeadFollowupSection userLeadId={id} followups={followups} canWrite={canWrite} />

          {/* Calls */}
          <LeadCallsSection calls={calls} userLeadId={id} />
        </div>
      </main>

      {/* Marks inbound messages for this user_lead as read when page is visited */}
      <MarkInboxRead userLeadId={id} />
    </>
  )
}
