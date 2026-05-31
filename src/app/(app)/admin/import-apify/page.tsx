import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { AdminImportApifyForm } from '@/features/admin/components/AdminImportApifyForm'

type SearchParams = Promise<{ categoryId?: string }>

export default async function AdminImportApifyPage({ searchParams }: { searchParams: SearchParams }) {
  const { categoryId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const categories = await listLeadCategories(supabase)

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Admin
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Importar via Apify</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-sm text-gray-500">
            Busca leads diretamente no Apify e insere no banco global com deduplicação automática.
          </p>
          <AdminImportApifyForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            initialCategoryId={categoryId ?? ''}
          />
        </div>
      </main>
    </>
  )
}
