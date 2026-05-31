import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { listRecentApifyImportJobs } from '@/repositories/apifyImportJobRepository'
import { AdminImportApifyForm } from '@/features/admin/components/AdminImportApifyForm'
import { AdminApifyUsageBox } from '@/features/admin/components/AdminApifyUsageBox'
import { AdminImportJobsList } from '@/features/admin/components/AdminImportJobsList'

type SearchParams = Promise<{ categoryId?: string }>

type ApifyUsage = {
  available: boolean
  username?: string | null
  plan_id?: string | null
  usage_pct?: number | null
  reason?: string
  consulted_at?: string
}

async function fetchApifyUsage(): Promise<ApifyUsage> {
  const token = process.env.APIFY_TOKEN
  if (!token) return { available: false, reason: 'APIFY_TOKEN não configurado' }

  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${token}`, {
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })
    if (!res.ok) return { available: false, reason: `Apify retornou ${res.status}` }

    const body = await res.json() as { data?: { username?: string; plan?: { id?: string; usageLevel?: number } } }
    const data = body.data
    if (!data) return { available: false, reason: 'Resposta inesperada' }

    const plan = data.plan
    const usagePct = typeof plan?.usageLevel === 'number' ? Math.round(plan.usageLevel * 100) : null

    return {
      available: true,
      username: data.username ?? null,
      plan_id: plan?.id ?? null,
      usage_pct: usagePct,
      consulted_at: new Date().toISOString(),
    }
  } catch {
    return { available: false, reason: 'Falha ao consultar Apify' }
  }
}

export default async function AdminImportApifyPage({ searchParams }: { searchParams: SearchParams }) {
  const { categoryId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [categories, usage, jobs] = await Promise.all([
    listLeadCategories(supabase),
    fetchApifyUsage(),
    listRecentApifyImportJobs(supabase, 20),
  ])

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
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <AdminApifyUsageBox usage={usage} />

          <AdminImportApifyForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            initialCategoryId={categoryId ?? ''}
          />

          <AdminImportJobsList jobs={jobs} />
        </div>
      </main>
    </>
  )
}
