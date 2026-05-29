import Link from 'next/link'
import type { AdminGlobalLead, AdminCategory } from '@/repositories/adminRepository'

const QUALITY_BADGE: Record<string, string> = {
  email_found: 'bg-green-50 text-green-700',
  website_only: 'bg-blue-50 text-blue-700',
  manual_review: 'bg-yellow-50 text-yellow-700',
  invalid: 'bg-red-50 text-red-700',
}

interface Props {
  leads: AdminGlobalLead[]
  categories: AdminCategory[]
  categoryFilter: string
  cityFilter: string
}

export function AdminGlobalLeads({ leads, categories, categoryFilter, cityFilter }: Props) {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const filterActive = !!categoryFilter || !!cityFilter
  const subtitle = filterActive ? `${leads.length} resultados` : `${leads.length} mais recentes`

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Global Leads{' '}
        <span className="text-sm font-normal text-gray-400">({subtitle})</span>
      </h2>

      {/* Filter form */}
      <form method="GET" action="/admin" className="mb-4 flex flex-wrap items-center gap-3">
        <select
          name="category"
          defaultValue={categoryFilter}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os nichos</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="city"
          defaultValue={cityFilter}
          placeholder="Filtrar por cidade..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Filtrar
        </button>

        {filterActive && (
          <Link
            href="/admin"
            className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          Nenhum lead encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nicho</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">UF</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Qualidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/admin/global-leads/${lead.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {lead.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.category_id
                      ? (categoryNameById.get(lead.category_id) ?? '—')
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.state ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${QUALITY_BADGE[lead.lead_quality_status] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {lead.lead_quality_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${lead.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
