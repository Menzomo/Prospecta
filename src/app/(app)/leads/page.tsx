import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { hideLeadAction, hideUserLeadAction } from '@/features/leads/actions'
import type { LeadStatus } from '@/types/leads'
import type { LeadCategory } from '@/types/globalLeads'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { PageHeader } from '@/components/layout/PageHeader'

type SearchParams = Promise<{ category?: string; city?: string }>

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function ThreeDotMenu({ leadHref, sendHref, hideAction }: {
  leadHref: string
  sendHref: string
  hideAction: (_formData: FormData) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={sendHref}
        className="rounded-md border border-outline px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-low"
      >
        Enviar email
      </Link>
      <Link
        href={leadHref}
        className="rounded-md border border-outline px-2.5 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-low"
      >
        Detalhes
      </Link>
      <form action={hideAction}>
        <button
          type="submit"
          className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs text-on-surface-muted transition-colors hover:bg-red-50 hover:text-red-500"
        >
          Ocultar
        </button>
      </form>
    </div>
  )
}

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

  const categoryById = new Map<string, LeadCategory>(categories.map((c) => [c.id, c]))
  const categoryBySlug = new Map<string, LeadCategory>(categories.map((c) => [c.slug, c]))

  const usedCategoryIds = new Set(searchLeads.map((l) => l.category_id).filter(Boolean))
  const categoriesInUse = categories.filter((c) => usedCategoryIds.has(c.id))

  const activeCategoryId =
    categoryFilter === 'all' ? null : (categoryBySlug.get(categoryFilter)?.id ?? null)

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

  const filteredManualLeads =
    activeCategoryId === null
      ? manualLeads.filter((l) => {
          if (cityFilter && !l.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
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

        {(categoryFilter !== 'all' || cityFilter) && (
          <Link
            href="/leads"
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
        <div className="rounded-xl border border-outline bg-surface-container shadow-card overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-outline bg-surface-low px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Empresa</span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Categoria</span>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Cidade</span>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Status</span>
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted">Ações</span>
          </div>

          <div className="divide-y divide-outline">
            {/* Search leads (user_leads) */}
            {filteredSearchLeads.map((lead) => (
              <div
                key={`search-${lead.id}`}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-low sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-start sm:gap-4"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Avatar name={lead.company_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{lead.company_name}</p>
                    {lead.email && (
                      <p className="truncate text-xs text-on-surface-muted">{lead.email}</p>
                    )}
                  </div>
                </div>
                <p className="self-start text-sm text-on-surface-muted">{lead.category_name ?? <span className="text-on-surface-muted/40">—</span>}</p>
                <p className="self-start text-sm text-on-surface-muted">{lead.city ?? <span className="text-on-surface-muted/40">—</span>}</p>
                <div className="self-start"><StatusBadge status={lead.status as LeadStatus} /></div>
                <div className="self-start">
                  <ThreeDotMenu
                    leadHref={`/leads/global/${lead.id}`}
                    sendHref={`/leads/global/${lead.id}/send`}
                    hideAction={hideUserLeadAction.bind(null, lead.id)}
                  />
                </div>
              </div>
            ))}

            {/* Manual leads */}
            {filteredManualLeads.map((lead) => (
              <div
                key={`manual-${lead.id}`}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-low sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-start sm:gap-4"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Avatar name={lead.company_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{lead.company_name}</p>
                    {lead.email && (
                      <p className="truncate text-xs text-on-surface-muted">{lead.email}</p>
                    )}
                  </div>
                </div>
                <p className="self-start text-sm text-on-surface-muted/40">—</p>
                <p className="self-start text-sm text-on-surface-muted">{lead.city ?? <span className="text-on-surface-muted/40">—</span>}</p>
                <div className="self-start"><StatusBadge status={lead.status as LeadStatus} /></div>
                <div className="self-start">
                  <ThreeDotMenu
                    leadHref={`/leads/${lead.id}`}
                    sendHref={`/leads/${lead.id}/send`}
                    hideAction={hideLeadAction.bind(null, lead.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div className="border-t border-outline bg-surface-low px-5 py-3">
            <p className="text-xs text-on-surface-muted">
              {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
