import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { listCategoriesWithAvailableLeadsForUser } from '@/repositories/leadCategoryRepository'
import { getGmailConnection, getGmailRequest } from '@/repositories/gmailRepository'
import { getAvailableCitiesForUser } from '@/repositories/globalLeadRepository'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import type { GmailRequestStatus } from '@/types/gmail'

type Props = { searchParams: Promise<{ step?: string }> }

export default async function OnboardingPage({ searchParams }: Props) {
  const { step: stepParam } = await searchParams
  const resumeStep = stepParam ? Math.max(1, Math.min(11, Number(stepParam))) || 1 : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [company, categories, connection, gmailRequest, availableCities] = await Promise.all([
    getCompanyProfileByUserId(supabase, user.id),
    listCategoriesWithAvailableLeadsForUser(supabase, user.id),
    getGmailConnection(supabase, user.id),
    getGmailRequest(supabase, user.id),
    getAvailableCitiesForUser(supabase, user.id),
  ])

  const firstAvailableCity = availableCities[0] ?? { city: 'Caxias do Sul', state: 'RS' }

  // Skip dashboard redirect when returning mid-wizard (e.g. after template creation)
  if (company && !resumeStep) redirect('/dashboard')

  const gmailRequestStatus: GmailRequestStatus =
    connection?.is_connected
      ? 'connected'
      : connection !== null
        ? 'approved'  // already connected before → skip request, go straight to connect
        : (gmailRequest?.gmail_request_status as GmailRequestStatus) ?? 'not_requested'

  return (
    <OnboardingWizard
      initialStep={resumeStep ?? 1}
      categories={categories}
      gmailRequestStatus={gmailRequestStatus}
      firstAvailableCity={firstAvailableCity}
    />
  )
}
