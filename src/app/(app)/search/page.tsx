import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listLeadCategories,
  listCategoriesWithAvailableLeadsForUser,
} from '@/repositories/leadCategoryRepository'
import { getAvailableCitiesForUser } from '@/repositories/globalLeadRepository'
import { SearchForm } from '@/features/search/components/SearchForm'

export default async function SearchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [categories, availableCities] = await Promise.all([
    isAdmin
      ? listLeadCategories(supabase)
      : listCategoriesWithAvailableLeadsForUser(supabase, user.id),
    isAdmin ? Promise.resolve(null) : getAvailableCitiesForUser(supabase, user.id),
  ])

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Buscar Leads</h1>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Buscar empresas</h2>
            <p className="mt-1 text-sm text-gray-500">
              Selecione categoria e cidade, veja os leads disponíveis e escolha quais adicionar em Meus Leads.
            </p>
          </div>

          <SearchForm
            categories={categories}
            availableCities={availableCities ?? undefined}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </>
  )
}
