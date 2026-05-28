import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hideUserLeadAction, updateUserLeadStatusAction } from '@/features/leads/actions'
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-indigo-100 text-indigo-700',
  interessado: 'bg-green-100 text-green-700',
  negociacao: 'bg-yellow-100 text-yellow-700',
  responder_depois: 'bg-orange-100 text-orange-700',
  sem_interesse: 'bg-gray-100 text-gray-600',
  sem_resposta: 'bg-red-100 text-red-700',
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

  const status = data.status as LeadStatus
  const statusLabel = LEAD_STATUS_LABELS[status] ?? data.status

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700">
              ← Leads
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-semibold text-gray-900">{gl.company_name}</h1>
          </div>

          <form action={hideUserLeadAction.bind(null, id)}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Ocultar lead
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Status bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Status atual</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {statusLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fonte</p>
                <p className="mt-0.5 text-sm text-gray-600">Busca</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Adicionado em</p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {new Date(data.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Dados do lead</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-500">Empresa</dt>
                <dd className="font-medium text-gray-800">{gl.company_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-500">Email</dt>
                <dd className="text-blue-600">{gl.email ?? '—'}</dd>
              </div>
              {gl.phone && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Telefone</dt>
                  <dd className="text-gray-800">{gl.phone}</dd>
                </div>
              )}
              {gl.website && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Site</dt>
                  <dd className="truncate text-gray-600">{gl.website}</dd>
                </div>
              )}
              {(gl.city || gl.state) && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Cidade</dt>
                  <dd className="text-gray-800">
                    {[gl.city, gl.state].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Update status */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Alterar status</h2>
            <form action={updateUserLeadStatusAction.bind(null, id)} className="flex gap-3">
              <select
                name="status"
                defaultValue={status}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
