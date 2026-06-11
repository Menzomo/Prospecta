import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { hideLeadAction, hideUserLeadAction } from '@/features/leads/actions'
import { LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'
import type { LeadCategory } from '@/types/globalLeads'

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-indigo-100 text-indigo-700',
  interessado: 'bg-green-100 text-green-700',
  negociacao: 'bg-yellow-100 text-yellow-700',
  responder_depois: 'bg-orange-100 text-orange-700',
  sem_interesse: 'bg-gray-100 text-gray-600',
  sem_resposta: 'bg-red-100 text-red-700',
}

type SearchParams = Promise<{ category?: string; city?: string }>

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: categoryFilter = 'all', city: cityFilter = '' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [manualLeads, searchLeads, categories] = await Promise.all([
    getLeadsByUserId(supabase, user.id),
    getUserLeadsWithGlobalData(supabase, user.id),
    listLeadCategories(supabase),
  ])

  // Build category lookup maps
  const categoryById = new Map<string, LeadCategory>(categories.map((c) => [c.id, c]))
  const categoryBySlug = new Map<string, LeadCategory>(categories.map((c) => [c.slug, c]))

  // Only show categories the user actually has leads in (avoids empty filter options)
  const usedCategoryIds = new Set(searchLeads.map((l) => l.category_id).filter(Boolean))
  const categoriesInUse = categories.filter((c) => usedCategoryIds.has(c.id))

  // Resolve active category filter
  const activeCategoryId =
    categoryFilter === 'all' ? null : (categoryBySlug.get(categoryFilter)?.id ?? null)

  // Filter and enrich search leads
  const filteredSearchLeads = searchLeads
    .filter((l) => {
      if (activeCategoryId !== null && l.category_id !== activeCategoryId) return false
      if (cityFilter && !l.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
      return true
    })
    .map((l) => ({
      ...l,
      category_name: l.category_id ? (categoryById.get(l.category_id)?.name ?? null) : null,
    }))

  // Filter manual leads (no category — only show under "Todos")
  const filteredManualLeads =
    activeCategoryId === null
      ? manualLeads.filter((l) => {
          if (cityFilter && !l.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
          return true
        })
      : []

  const totalCount = filteredSearchLeads.length + filteredManualLeads.length

  return (
    <>
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

      <main className="flex flex-1 flex-col gap-4 p-6">
        {/* Filters */}
        <form method="GET" action="/leads" className="flex flex-wrap items-center gap-3">
          <select
            key={categoryFilter}
            name="category"
            defaultValue={categoryFilter}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos os nichos</option>
            {categoriesInUse.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            key={cityFilter}
            type="text"
            name="city"
            defaultValue={cityFilter}
            placeholder="Filtrar por cidade..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Filtrar
          </button>

          {(categoryFilter !== 'all' || cityFilter) && (
            <Link
              href="/leads"
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
            >
              Limpar filtros
            </Link>
          )}
        </form>

        {/* Table or empty state */}
        {totalCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">
              {categoryFilter !== 'all' || cityFilter
                ? 'Nenhum lead encontrado para os filtros selecionados.'
                : 'Nenhum lead cadastrado ainda.'}
            </p>
            {!categoryFilter || categoryFilter === 'all' ? (
              <Link href="/leads/new" className="mt-3 text-sm text-blue-600 hover:underline">
                Adicionar seu primeiro lead
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-2.5 text-xs text-gray-400">
              {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-5 py-3.5 font-medium text-gray-600">Empresa</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Nicho</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Email</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Cidade</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Status</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSearchLeads.map((lead) => {
                    const status = lead.status as LeadStatus
                    return (
                      <tr key={`search-${lead.id}`} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {lead.company_name}
                        </td>
                        <td className="px-5 py-4 text-gray-500">
                          {lead.category_name ?? (
                            <span className="text-gray-300">Sem categoria</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{lead.email ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-600">{lead.city ?? '—'}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {LEAD_STATUS_LABELS[status] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/leads/global/${lead.id}/send`}
                              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Enviar email
                            </Link>
                            <Link
                              href={`/leads/global/${lead.id}`}
                              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                              Detalhes
                            </Link>
                            <form action={hideUserLeadAction.bind(null, lead.id)}>
                              <button
                                type="submit"
                                className="cursor-pointer rounded px-2 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                Ocultar
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredManualLeads.map((lead) => {
                    const status = lead.status as LeadStatus
                    return (
                      <tr key={`manual-${lead.id}`} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {lead.company_name}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-gray-300">Sem categoria</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{lead.email ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-600">{lead.city ?? '—'}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {LEAD_STATUS_LABELS[status] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/leads/${lead.id}/send`}
                              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Enviar email
                            </Link>
                            <Link
                              href={`/leads/${lead.id}`}
                              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                              Detalhes
                            </Link>
                            <form action={hideLeadAction.bind(null, lead.id)}>
                              <button
                                type="submit"
                                className="cursor-pointer rounded px-2 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                Ocultar
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
