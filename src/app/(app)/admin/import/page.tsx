import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminImportForm } from '@/features/admin/components/AdminImportForm'

export default async function AdminImportPage() {
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

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Admin
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Importar Leads (Apify)</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">
          <AdminImportForm />
        </div>
      </main>
    </>
  )
}
