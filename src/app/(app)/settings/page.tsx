import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getGmailConnection, getGmailRequest } from '@/repositories/gmailRepository'
import type { GmailRequestStatus } from '@/types/gmail'
import { CompanyProfileForm } from '@/features/settings/components/CompanyProfileForm'
import { GmailConnectionCard } from '@/features/gmail/components/GmailConnectionCard'
import { PageHeader } from '@/components/layout/PageHeader'

type Section = 'empresa' | 'gmail' | 'idioma' | 'aparencia' | 'plano'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'empresa',   label: 'Dados da Empresa' },
  { key: 'gmail',     label: 'Gmail' },
  { key: 'idioma',    label: 'Idioma' },
  { key: 'aparencia', label: 'Aparência' },
  { key: 'plano',     label: 'Assinatura' },
]

type Props = { searchParams: Promise<{ section?: string }> }

export default async function SettingsPage({ searchParams }: Props) {
  const { section: raw = 'empresa' } = await searchParams
  const section: Section = (SECTIONS.some((s) => s.key === raw) ? raw : 'empresa') as Section

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [company, gmailConnection, gmailRequest] = await Promise.all([
    getCompanyProfileByUserId(supabase, user.id),
    getGmailConnection(supabase, user.id),
    getGmailRequest(supabase, user.id),
  ])

  const gmailRequestStatus: GmailRequestStatus =
    gmailConnection?.is_connected
      ? 'connected'
      : gmailConnection !== null
        ? 'approved'  // already connected before → skip request, go straight to connect
        : (gmailRequest?.gmail_request_status as GmailRequestStatus) ?? 'not_requested'

  return (
    <main className="flex flex-col gap-6 p-6">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e integrações" />

      <div className="mx-auto w-full max-w-lg">

        {/* Dados da Empresa */}
        {section === 'empresa' && (
          <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
            <h2 className="mb-1 text-base font-semibold text-on-surface font-[--font-heading]">
              Dados da Empresa
            </h2>
            <p className="mb-6 text-sm text-on-surface-muted">
              Essas informações são usadas nos seus emails de prospecção.
            </p>
            {company ? (
              <CompanyProfileForm initialData={company} />
            ) : (
              <p className="text-sm text-on-surface-muted">Perfil de empresa não encontrado.</p>
            )}
          </div>
        )}

        {/* Gmail */}
        {section === 'gmail' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">Gmail</h2>
              <p className="mt-1 text-sm text-on-surface-muted">
                Conecte sua conta Gmail para enviar emails de prospecção diretamente pelo Prospecta.
              </p>
            </div>
            <GmailConnectionCard
              connection={gmailConnection}
              requestStatus={gmailRequestStatus}
              requestEmail={gmailRequest?.gmail_request_email ?? null}
            />
          </div>
        )}

        {/* Idioma */}
        {section === 'idioma' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">Idioma</h2>
              <p className="mt-1 text-sm text-on-surface-muted">Preferências de idioma da plataforma.</p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Idioma atual</p>
                  <p className="mt-0.5 text-sm text-on-surface-muted">Português (Brasil)</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Ativo
                </span>
              </div>
              <p className="mt-5 text-sm text-on-surface-muted/60">Novos idiomas estarão disponíveis em breve.</p>
            </div>
          </div>
        )}

        {/* Aparência */}
        {section === 'aparencia' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">Aparência</h2>
              <p className="mt-1 text-sm text-on-surface-muted">Personalize o visual da plataforma.</p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border-2 border-primary p-4">
                  <div className="h-8 w-full rounded-md bg-surface-low" />
                  <span className="text-xs font-semibold text-on-surface">Claro</span>
                  <span className="text-xs text-primary">Ativo</span>
                </div>
                <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border-2 border-outline p-4 opacity-50">
                  <div className="h-8 w-full rounded-md bg-sidebar" />
                  <span className="text-xs font-semibold text-on-surface">Escuro</span>
                </div>
              </div>
              <p className="mt-5 text-sm text-on-surface-muted/60">Personalização visual em breve.</p>
            </div>
          </div>
        )}

        {/* Assinatura */}
        {section === 'plano' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">
                Plano e Assinatura
              </h2>
              <p className="mt-1 text-sm text-on-surface-muted">Seu plano atual e opções disponíveis.</p>
            </div>

            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Plano atual</p>
                  <p className="mt-1 text-xl font-bold text-on-surface font-[--font-heading]">Beta Gratuito</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Ativo</span>
              </div>
              <ul className="mt-4 space-y-2">
                {['20 leads gratuitos', 'Templates de email', 'Gestão de leads', 'Acompanhamentos'].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-on-surface">
                    <span className="text-primary">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
                Em breve
              </p>
              <p className="text-base font-bold text-on-surface font-[--font-heading]">Prospecta Starter</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">R$ 49,90</span>
                <span className="text-sm text-on-surface-muted">/mês</span>
              </div>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-on-surface-muted">
                  <span>✓</span>
                  200 leads por mês
                </li>
              </ul>
              <button
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-lg bg-surface-low px-4 py-2.5 text-sm font-medium text-on-surface-muted"
              >
                Em breve
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
