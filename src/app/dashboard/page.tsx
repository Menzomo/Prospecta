import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { countUnreadInboundMessages } from '@/repositories/emailRepository'
import { logoutAction } from '@/features/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const company = await getCompanyProfileByUserId(supabase, user.id)
  if (!company) {
    redirect('/onboarding')
  }

  const unreadCount = await countUnreadInboundMessages(supabase, user.id)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Prospecta</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{company.company_name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Bem-vindo, {company.company_name}!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              O dashboard completo será implementado na Fase 9.
            </p>
          </div>

          {unreadCount > 0 && (
            <Link
              href="/inbox"
              className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 transition-colors hover:bg-blue-100"
            >
              <div>
                <p className="text-sm font-semibold text-blue-800">Respostas pendentes</p>
                <p className="mt-0.5 text-xs text-blue-600">Clique para ver na inbox</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {unreadCount}
              </span>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
