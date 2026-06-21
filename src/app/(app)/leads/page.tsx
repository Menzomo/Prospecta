import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { hideLeadAction, hideUserLeadAction } from '@/features/leads/actions'
import type { LeadStatus } from '@/types/leads'
import type { LeadCategory } from '@/types/globalLeads'
import { PageHeader } from '@/components/layout/PageHeader'
import { LeadsGrid } from '@/features/leads/components/LeadsGrid'
import type { LeadCardData } from '@/features/leads/components/LeadsGrid'

type SearchParams = Promise<{ category?: string; city?: string; search?: string }>

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}


export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: categoryFilter = 'all', city: cityFilter = '', search: searchFilter = '' } = await searchParams

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

  const categoryById = new Map<string, LeadCategory>(categories.map((c) => [c.id, c]))
  const categoryBySlug = new Map<string, LeadCategory>(categories.map((c) => [c.slug, c]))

  const usedCategoryIds = new Set(searchLeads.map((l) => l.category_id).filter(Boolean))
  const categoriesInUse = categories.filter((c) => usedCategoryIds.has(c.id))

  const activeCategoryId =
    categoryFilter === 'all' ? null : (categoryBySlug.get(categoryFilter)?.id ?? null)

  const nameQuery = searchFilter.toLowerCase()

  const filteredSearchLeads = searchLeads
    .filter((l) => {
      if (activeCategoryId !== null && l.category_id !== activeCategoryId) return false
      if (cityFilter && !l.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
      if (nameQuery && !l.company_name.toLowerCase().includes(nameQuery)) return false
      return true
    })
    .map((l) => ({
      ...l,
      category_name: l.category_id ? (categoryById.get(l.category_id)?.name ?? null) : null,
    }))

  const filteredManualLeads =
    activeCategoryId === null
      ? manualLeads.filter((l) => {
          if (cityFilter && !l.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
          if (nameQuery && !l.company_name.toLowerCase().includes(nameQuery)) return false
          return true
        })
      : []

  const totalCount = filteredSearchLeads.length + filteredManualLeads.length

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader
        title="Leads"
        subtitle="Gerencie sua base de prospecção"
        actions={
          <Link
            href="/leads/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark active:scale-95"
          >
            + Adicionar lead
          </Link>
        }
      />

      {/* Filters */}
      <form method="GET" action="/leads" className="flex flex-wrap items-center gap-2">
        {/* Preserve active name search when applying category/city filters */}
        {searchFilter && <input type="hidden" name="search" value={searchFilter} />}

        <select
          key={categoryFilter}
          name="category"
          defaultValue={categoryFilter}
          className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Todos os nichos</option>
          {categoriesInUse.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>

        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-on-surface-muted">
            <IconSearch />
          </span>
          <input
            key={cityFilter}
            type="text"
            name="city"
            defaultValue={cityFilter}
            placeholder="Filtrar por cidade..."
            className="rounded-lg border border-outline bg-surface-container py-2 pl-8 pr-3 text-sm text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-surface-low border border-outline px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-outline"
        >
          Filtrar
        </button>

        {searchFilter && (
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            &ldquo;{searchFilter}&rdquo;
            <Link href="/leads" aria-label="Limpar busca" className="hover:text-primary-dark">✕</Link>
          </span>
        )}

        {(categoryFilter !== 'all' || cityFilter) && (
          <Link
            href={searchFilter ? `/leads?search=${encodeURIComponent(searchFilter)}` : '/leads'}
            className="text-sm text-on-surface-muted hover:text-on-surface hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {totalCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-on-surface-muted">
            {categoryFilter !== 'all' || cityFilter
              ? 'Nenhum lead encontrado para os filtros selecionados.'
              : 'Nenhum lead cadastrado ainda.'}
          </p>
          {!categoryFilter || categoryFilter === 'all' ? (
            <Link href="/leads/new" className="mt-3 text-sm text-primary hover:underline">
              Adicionar seu primeiro lead
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-xs text-on-surface-muted">
            {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
          </p>
          <LeadsGrid
            leads={[
              ...filteredSearchLeads.map((lead): LeadCardData => ({
                key: `search-${lead.id}`,
                company_name: lead.company_name,
                email: lead.email ?? null,
                city: lead.city ?? null,
                category_name: lead.category_name ?? null,
                status: lead.status as LeadStatus,
                leadHref: `/leads/global/${lead.id}`,
                sendHref: `/leads/global/${lead.id}/send`,
                hideAction: hideUserLeadAction.bind(null, lead.id),
              })),
              ...filteredManualLeads.map((lead): LeadCardData => ({
                key: `manual-${lead.id}`,
                company_name: lead.company_name,
                email: lead.email ?? null,
                city: lead.city ?? null,
                category_name: null,
                status: lead.status as LeadStatus,
                leadHref: `/leads/${lead.id}`,
                sendHref: `/leads/${lead.id}/send`,
                hideAction: hideLeadAction.bind(null, lead.id),
              })),
            ]}
          />
        </>
      )}
    </main>
  )
}
