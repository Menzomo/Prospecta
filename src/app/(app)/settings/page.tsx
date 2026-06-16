import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { CompanyProfileForm } from '@/features/settings/components/CompanyProfileForm'
import { GmailConnectionCard } from '@/features/gmail/components/GmailConnectionCard'
import { logoutAction } from '@/features/auth/actions'

type Section = 'empresa' | 'gmail' | 'idioma' | 'aparencia' | 'plano'

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'empresa', label: 'Dados da Empresa' },
  { key: 'gmail', label: 'Gmail' },
  { key: 'idioma', label: 'Idioma' },
  { key: 'aparencia', label: 'Aparência' },
  { key: 'plano', label: 'Assinatura' },
]

type Props = { searchParams: Promise<{ section?: string }> }

export default async function SettingsPage({ searchParams }: Props) {
  const { section: raw = 'empresa' } = await searchParams
  const section: Section = (NAV_ITEMS.some((i) => i.key === raw) ? raw : 'empresa') as Section

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [company, gmailConnection] = await Promise.all([
    getCompanyProfileByUserId(supabase, user.id),
    getGmailConnection(supabase, user.id),
  ])

  return (
    <>
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">

        {/* ── Sidebar ── */}
        <nav className="shrink-0 border-b border-gray-200 bg-white md:w-56 md:border-b-0 md:border-r md:flex md:flex-col">
          {/* Nav links — horizontal scroll on mobile, vertical on desktop */}
          <ul className="flex overflow-x-auto md:flex-col md:flex-1 md:overflow-visible md:py-3">
            {NAV_ITEMS.map(({ key, label }) => (
              <li key={key} className="shrink-0 md:shrink">
                <Link
                  href={`/settings?section=${key}`}
                  className={`flex cursor-pointer items-center px-5 py-3 text-sm font-medium transition-colors md:w-full ${
                    section === key
                      ? 'border-b-2 border-blue-600 text-blue-600 md:border-b-0 md:border-l-2 md:bg-blue-50'
                      : 'border-b-2 border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:border-b-0 md:border-l-2 md:border-transparent'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Logout — below divider on desktop, after tabs on mobile */}
          <div className="border-t border-gray-100 py-2 md:shrink-0">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center px-5 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                Sair
              </button>
            </form>
          </div>
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 overflow-auto p-6">

          {/* Dados da Empresa */}
          {section === 'empresa' && (
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Dados da Empresa</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Essas informações são usadas nos seus emails de prospecção.
                </p>
              </div>
              {company ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <CompanyProfileForm initialData={company} />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Perfil de empresa não encontrado.</p>
              )}
            </div>
          )}

          {/* Gmail */}
          {section === 'gmail' && (
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Gmail</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Conecte sua conta Gmail para enviar emails de prospecção diretamente pelo Prospecta.
                </p>
              </div>
              <GmailConnectionCard connection={gmailConnection} />
            </div>
          )}

          {/* Idioma */}
          {section === 'idioma' && (
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Idioma</h2>
                <p className="mt-1 text-sm text-gray-500">Preferências de idioma da plataforma.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Idioma atual</p>
                    <p className="mt-0.5 text-sm text-gray-900">Português (Brasil)</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    Ativo
                  </span>
                </div>
                <p className="mt-5 text-sm text-gray-400">
                  Novos idiomas estarão disponíveis em breve.
                </p>
              </div>
            </div>
          )}

          {/* Aparência */}
          {section === 'aparencia' && (
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Aparência</h2>
                <p className="mt-1 text-sm text-gray-500">Personalize o visual da plataforma.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border-2 border-blue-500 p-4">
                    <div className="h-8 w-full rounded-md bg-gray-100" />
                    <span className="text-xs font-semibold text-gray-800">Claro</span>
                    <span className="text-xs text-blue-600">Ativo</span>
                  </div>
                  <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border-2 border-gray-200 p-4 opacity-50">
                    <div className="h-8 w-full rounded-md bg-gray-700" />
                    <span className="text-xs font-semibold text-gray-800">Escuro</span>
                  </div>
                </div>
                <p className="mt-5 text-sm text-gray-400">Personalização visual em breve.</p>
              </div>
            </div>
          )}

          {/* Assinatura */}
          {section === 'plano' && (
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Plano e Assinatura</h2>
                <p className="mt-1 text-sm text-gray-500">Seu plano atual e opções disponíveis.</p>
              </div>

              {/* Current plan */}
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Plano atual
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900">Beta Gratuito</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Ativo
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {[
                    '20 leads gratuitos',
                    'Templates de email',
                    'Gestão de leads',
                    'Acompanhamentos',
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-blue-800">
                      <span className="text-blue-500">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upcoming plan */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Em breve
                </p>
                <p className="text-base font-bold text-gray-900">Prospecta Starter</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">R$ 49,90</span>
                  <span className="text-sm text-gray-500">/mês</span>
                </div>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400">✓</span>
                    200 leads por mês
                  </li>
                </ul>
                <button
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400"
                >
                  Em breve
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  )
}
