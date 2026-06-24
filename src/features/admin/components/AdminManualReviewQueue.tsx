import Link from 'next/link'
import type { ManualReviewLead } from '@/repositories/leadQualityRepository'
import type { AdminCategory } from '@/repositories/adminRepository'
import {
  dismissGlobalLeadAction,
  approveGlobalLeadAction,
  rejectGlobalLeadAction,
  reprocessGlobalLeadAction,
} from '@/features/admin/actions'

interface Props {
  leads: ManualReviewLead[]
  categories: AdminCategory[]
  activeNiche: string
  categoryFilter: string
  cityFilter: string
}

const QUALITY_BADGE: Record<string, string> = {
  complete:   'bg-green-50 text-green-700',
  email_only: 'bg-blue-50 text-blue-700',
  phone_only: 'bg-purple-50 text-purple-700',
  incomplete: 'bg-red-50 text-red-700',
}

const QUALITY_LABEL: Record<string, string> = {
  complete:   'Completo',
  email_only: 'Só email',
  phone_only: 'Só telefone',
  incomplete: 'Incompleto',
}

export function AdminManualReviewQueue({
  leads,
  categories,
  activeNiche,
  categoryFilter,
  cityFilter,
}: Props) {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const clearNicheParams = new URLSearchParams()
  if (categoryFilter) clearNicheParams.set('category', categoryFilter)
  if (cityFilter) clearNicheParams.set('city', cityFilter)
  const clearNicheUrl = clearNicheParams.toString()
    ? `/admin?${clearNicheParams.toString()}`
    : '/admin'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Revisão de Leads{' '}
        <span className="text-sm font-normal text-gray-400">({leads.length} aguardando)</span>
      </h2>

      {/* Nicho filter */}
      <form method="GET" action="/admin" className="mb-4 flex flex-wrap items-center gap-3">
        {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
        {cityFilter && <input type="hidden" name="city" value={cityFilter} />}

        <select
          name="reviewNiche"
          defaultValue={activeNiche}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os nichos</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Filtrar
        </button>

        {activeNiche && (
          <Link href={clearNicheUrl} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Limpar filtro
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          {activeNiche
            ? 'Nenhum lead neste nicho aguardando revisão.'
            : 'Nenhum lead aguardando revisão.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="max-h-130 overflow-x-auto overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nicho</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Qualidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.company_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {lead.category_id ? (categoryNameById.get(lead.category_id) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {lead.email ? (
                        <span className="text-blue-600">{lead.email}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${QUALITY_BADGE[lead.lead_quality_status] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {QUALITY_LABEL[lead.lead_quality_status] ?? lead.lead_quality_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Aprovar */}
                        <form action={approveGlobalLeadAction.bind(null, lead.id)}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded px-2 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            Aprovar
                          </button>
                        </form>

                        {/* Rejeitar */}
                        <form action={rejectGlobalLeadAction.bind(null, lead.id)}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            Rejeitar
                          </button>
                        </form>

                        {/* Reprocessar */}
                        <form action={reprocessGlobalLeadAction.bind(null, lead.id)}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Reprocessar
                          </button>
                        </form>

                        {/* Adicionar email (se não tem) */}
                        {!lead.email && (
                          <Link
                            href={`/admin/global-leads/${lead.id}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            + Email
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
