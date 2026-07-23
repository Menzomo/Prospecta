import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadsByUserId } from '@/repositories/leadRepository'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { hideLeadAction, hideUserLeadAction } from '@/features/leads/actions'
import { hasTelephonyConfigured } from '@/repositories/telephonySettingsRepository'
import { hasActiveSubscription } from '@/repositories/profileRepository'
import type { LeadStatus } from '@/types/leads'
import type { LeadCategory } from '@/types/globalLeads'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeadCardData } from '@/features/leads/components/LeadsGrid'
import { LeadsView } from '@/features/leads/components/LeadsView'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [manualLeads, searchLeads, categories, hasSettings, canWrite] = await Promise.all([
    getLeadsByUserId(supabase, user.id),
    getUserLeadsWithGlobalData(supabase, user.id),
    listLeadCategories(supabase),
    hasTelephonyConfigured(supabase, user.id),
    hasActiveSubscription(supabase, user.id),
  ])

  const categoryById = new Map<string, LeadCategory>(categories.map((c) => [c.id, c]))

  const usedCategoryIds = new Set(searchLeads.map((l) => l.category_id).filter(Boolean))
  const categoriesInUse = categories.filter((c) => usedCategoryIds.has(c.id))

  const allLeads: LeadCardData[] = [
    ...searchLeads.map((lead): LeadCardData => ({
      key: `search-${lead.id}`,
      company_name: lead.company_name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      category_name: lead.category_id ? (categoryById.get(lead.category_id)?.name ?? null) : null,
      status: lead.status as LeadStatus,
      leadHref: `/leads/global/${lead.id}`,
      sendHref: `/leads/global/${lead.id}/send`,
      hideAction: canWrite ? hideUserLeadAction.bind(null, lead.id) : undefined,
      userLeadId: lead.id,
    })),
    ...manualLeads.map((lead): LeadCardData => ({
      key: `manual-${lead.id}`,
      company_name: lead.company_name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      city: lead.city ?? null,
      category_name: null,
      status: lead.status as LeadStatus,
      leadHref: `/leads/${lead.id}`,
      sendHref: `/leads/${lead.id}/send`,
      hideAction: canWrite ? hideLeadAction.bind(null, lead.id) : undefined,
      leadId: lead.id,
    })),
  ]

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

      <LeadsView
        leads={allLeads}
        categories={categoriesInUse}
        hasSettings={hasSettings}
      />
    </main>
  )
}
