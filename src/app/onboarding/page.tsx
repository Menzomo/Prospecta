import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

type Props = { searchParams: Promise<{ step?: string }> }

export default async function OnboardingPage({ searchParams }: Props) {
  const { step: stepParam } = await searchParams
  const resumeStep = stepParam ? Math.max(1, Math.min(9, Number(stepParam))) || 1 : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [company, categories] = await Promise.all([
    getCompanyProfileByUserId(supabase, user.id),
    listLeadCategories(supabase),
  ])

  // Skip dashboard redirect when returning mid-wizard (e.g. after template creation)
  if (company && !resumeStep) redirect('/dashboard')

  return <OnboardingWizard initialStep={resumeStep ?? 1} categories={categories} />
}
