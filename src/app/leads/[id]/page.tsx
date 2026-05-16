import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadById } from '@/repositories/leadRepository'
import { getEmailMessagesByLeadId } from '@/repositories/emailRepository'
import { hideLeadAction } from '@/features/leads/actions'
import { LeadEditForm } from '@/features/leads/components/LeadEditForm'
import { LeadEmailHistory } from '@/features/leads/components/LeadEmailHistory'
import { LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'

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

  const emailMessages = await getEmailMessagesByLeadId(supabase, user.id, id)

  const status = lead.status as LeadStatus
  const statusLabel = LEAD_STATUS_LABELS[status] ?? lead.status

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700">
              ← Leads
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-semibold text-gray-900">{lead.company_name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/leads/${lead.id}/send`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Enviar email
            </Link>
            <form action={hideLeadAction.bind(null, lead.id)}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                Ocultar lead
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Status atual</p>
                <p className="mt-0.5 font-medium text-gray-900">{statusLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fonte</p>
                <p className="mt-0.5 text-sm text-gray-600 capitalize">{lead.source}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cadastrado em</p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Editar dados</h2>
            <LeadEditForm lead={lead} />
          </div>

          <LeadEmailHistory messages={emailMessages} />
        </div>
      </main>
    </div>
  )
}
