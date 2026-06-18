import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGmailConnection, getGmailRequest } from '@/repositories/gmailRepository'
import { GmailConnectionCard } from '@/features/gmail/components/GmailConnectionCard'
import type { GmailRequestStatus } from '@/types/gmail'

type Props = {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Autorização cancelada. Tente novamente.',
  oauth_config: 'Configuração OAuth ausente. Contate o suporte.',
  invalid_callback: 'Callback inválido. Tente novamente.',
  state_mismatch: 'Erro de segurança no OAuth. Tente novamente.',
  token_exchange_failed: 'Falha ao obter tokens do Google. Tente novamente.',
  userinfo_failed: 'Falha ao obter informações da conta Google. Tente novamente.',
  save_failed: 'Falha ao salvar conexão. Tente novamente.',
}

export default async function GmailSettingsPage({ searchParams }: Props) {
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [connection, gmailRequest] = await Promise.all([
    getGmailConnection(supabase, user.id),
    getGmailRequest(supabase, user.id),
  ])

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Erro desconhecido. Tente novamente.') : null

  const requestStatus: GmailRequestStatus =
    connection?.is_connected
      ? 'connected'
      : (gmailRequest?.gmail_request_status as GmailRequestStatus) ?? 'not_requested'

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
            ← Configurações
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Conexão Gmail</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
          )}
          <GmailConnectionCard
            connection={connection}
            requestStatus={requestStatus}
            requestEmail={gmailRequest?.gmail_request_email ?? null}
          />
        </div>
      </main>
    </>
  )
}
