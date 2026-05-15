import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { hideLeadAction } from '@/features/leads/actions'
import { LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-indigo-100 text-indigo-700',
  interessado: 'bg-green-100 text-green-700',
  negociacao: 'bg-yellow-100 text-yellow-700',
  responder_depois: 'bg-orange-100 text-orange-700',
  sem_interesse: 'bg-gray-100 text-gray-600',
  sem_resposta: 'bg-red-100 text-red-700',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const leads = await getLeadsByUserId(supabase, user.id)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Leads</h1>
          <Link
            href="/leads/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Adicionar lead
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-6">
        {leads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">Nenhum lead cadastrado ainda.</p>
            <Link href="/leads/new" className="mt-3 text-sm text-blue-600 hover:underline">
              Adicionar seu primeiro lead
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Contato</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Cidade</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const status = lead.status as LeadStatus
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.contact_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {LEAD_STATUS_LABELS[status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={hideLeadAction.bind(null, lead.id)}>
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            Ocultar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
