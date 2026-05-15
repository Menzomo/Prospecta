import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadCreateForm } from '@/features/leads/components/LeadCreateForm'

export default async function NewLeadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700">
            ← Leads
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Novo lead</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <LeadCreateForm />
          </div>
        </div>
      </main>
    </div>
  )
}
