'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companyProfileSchema } from '@/validations/companyProfileSchema'
import { updateCompanyProfile } from '@/repositories/companyProfileRepository'

export type UpdateCompanyActionState = {
  errors?: {
    company_name?: string[]
    description?: string[]
    city?: string[]
    phone?: string[]
    commercial_email?: string[]
    website?: string[]
  }
  error?: string
  success?: boolean
} | null

export async function updateCompanyAction(
  _state: UpdateCompanyActionState,
  formData: FormData
): Promise<UpdateCompanyActionState> {
  const validation = companyProfileSchema.safeParse({
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

  const company = await updateCompanyProfile(supabase, user.id, validation.data)

  if (!company) {
    return { error: 'Erro ao atualizar dados da empresa. Tente novamente.' }
  }

  return { success: true }
}
