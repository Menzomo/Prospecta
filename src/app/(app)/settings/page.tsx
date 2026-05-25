import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Link
            href="/settings/company"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Dados da empresa</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Nome, descrição, cidade, telefone, email comercial e logo
              </p>
            </div>
            <span className="ml-4 shrink-0 text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/gmail"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Conectar Gmail</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Conecte sua conta Gmail para enviar emails de prospecção
              </p>
            </div>
            <span className="ml-4 shrink-0 text-gray-400">→</span>
          </Link>
        </div>
      </main>
    </>
  )
}
