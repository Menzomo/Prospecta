import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { CompanyProfileForm } from '@/features/settings/components/CompanyProfileForm'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const company = await getCompanyProfileByUserId(supabase, user.id)
  if (!company) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Dados da empresa</h2>
            <p className="mt-1 text-sm text-gray-500">
              Essas informações são usadas nos seus emails de prospecção.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <CompanyProfileForm initialData={company} />
          </div>
        </div>
      </main>
    </div>
  )
}
