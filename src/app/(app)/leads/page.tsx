import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { hideLeadAction, hideUserLeadAction } from '@/features/leads/actions'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import type { LeadStatus } from '@/types/leads'
import type { LeadCategory } from '@/types/globalLeads'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeadCardData } from '@/features/leads/components/LeadsGrid'
import { LeadsKanban } from '@/features/leads/components/LeadsKanban'
import { LeadsFilterForm } from '@/features/leads/components/LeadsFilterForm'

type SearchParams = Promise<{ category?: string; city?: string; search?: string }>


export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: categoryFilter = 'all', city: cityFilter = '', search: searchFilter = '' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [manualLeads, searchLeads, categories, telephonySettings] = await Promise.all([
    getLeadsByUserId(supabase, user.id),
    getUserLeadsWithGlobalData(supabase, user.id),
    listLeadCategories(supabase),
    getTelephonySettings(supabase, user.id),
  ])

  const hasSettings = telephonySettings !== null

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

  const allLeads: LeadCardData[] = [
    ...filteredSearchLeads.map((lead): LeadCardData => ({
      key: `search-${lead.id}`,
      company_name: lead.company_name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      category_name: lead.category_name ?? null,
      status: lead.status as LeadStatus,
      leadHref: `/leads/global/${lead.id}`,
      sendHref: `/leads/global/${lead.id}/send`,
      hideAction: hideUserLeadAction.bind(null, lead.id),
      userLeadId: lead.id,
    })),
    ...filteredManualLeads.map((lead): LeadCardData => ({
      key: `manual-${lead.id}`,
      company_name: lead.company_name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      category_name: null,
      status: lead.status as LeadStatus,
      leadHref: `/leads/${lead.id}`,
      sendHref: `/leads/${lead.id}/send`,
      hideAction: hideLeadAction.bind(null, lead.id),
      leadId: lead.id,
    })),
  ]

  const totalCount = allLeads.length

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
      <LeadsFilterForm
        categories={categoriesInUse}
        currentCategory={categoryFilter}
        currentCity={cityFilter}
        currentSearch={searchFilter}
      />

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
        <LeadsKanban
          leads={allLeads}
          hasSettings={hasSettings}
        />
      )}
    </main>
  )
}
