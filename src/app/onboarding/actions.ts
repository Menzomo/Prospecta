'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { onboardingSchema } from '@/validations/onboardingSchema'
import { createCompanyProfile } from '@/repositories/companyProfileRepository'

export type OnboardingActionState = {
  errors?: {
    company_name?: string[]
    description?: string[]
    city?: string[]
    phone?: string[]
    commercial_email?: string[]
    website?: string[]
  }
  error?: string
} | null

export async function onboardingAction(
  _state: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const validation = onboardingSchema.safeParse({
    company_name: formData.get('company_name'),
    description: formData.get('description') || undefined,
    city: formData.get('city') || undefined,
    phone: formData.get('phone') || undefined,
    commercial_email: formData.get('commercial_email') || undefined,
    website: formData.get('website') || undefined,
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const company = await createCompanyProfile(supabase, user.id, validation.data)

  if (!company) {
    return { error: 'Erro ao salvar dados da empresa. Tente novamente.' }
  }

  redirect('/dashboard')
}
