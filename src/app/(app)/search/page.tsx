import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listLeadCategories,
  listCategoriesWithAvailableLeadsForUser,
} from '@/repositories/leadCategoryRepository'
import { getAvailableCitiesForUser } from '@/repositories/globalLeadRepository'
import { hasActiveSubscription } from '@/repositories/profileRepository'
import { SearchForm } from '@/features/search/components/SearchForm'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'
import { PageHeader } from '@/components/layout/PageHeader'

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
  const canWrite = await hasActiveSubscription(supabase, user.id)

  const [categories, availableCities] = await Promise.all([
    isAdmin
      ? listLeadCategories(supabase)
      : listCategoriesWithAvailableLeadsForUser(supabase, user.id),
    isAdmin ? Promise.resolve(null) : getAvailableCitiesForUser(supabase, user.id),
  ])

  return (
    <main className="p-6">
      <PageHeader
        title="Buscar Leads"
        subtitle="Selecione categoria e cidade para descobrir empresas disponíveis"
      />
      <div className="mx-auto max-w-2xl">
        {canWrite ? (
          <SearchForm
            categories={categories}
            availableCities={availableCities ?? undefined}
            isAdmin={isAdmin}
          />
        ) : (
          <SubscriptionGateCard description="Assine o Prospecta pra buscar novos leads." />
        )}
      </div>
    </main>
  )
}
