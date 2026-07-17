import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getGmailConnection, getGmailRequest } from '@/repositories/gmailRepository'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { getBalance, getTransactions } from '@/repositories/walletRepository'
import { getAssignedNumber, getAvailableNumbers } from '@/repositories/telnyxNumberRepository'
import type { GmailRequestStatus } from '@/types/gmail'
import type { WalletTransaction } from '@/repositories/walletRepository'
import { CompanyProfileForm } from '@/features/settings/components/CompanyProfileForm'
import { GmailConnectionCard } from '@/features/gmail/components/GmailConnectionCard'
import { TelephonySettingsForm } from '@/features/calls/components/TelephonySettingsForm'
import { NumberClaimForm } from '@/features/calls/components/NumberClaimForm'
import { ForwardingDetailsForm } from '@/features/calls/components/ForwardingDetailsForm'
import { PageHeader } from '@/components/layout/PageHeader'

type Section = 'empresa' | 'gmail' | 'telefonia' | 'carteira' | 'idioma' | 'aparencia' | 'plano'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'empresa',   label: 'Dados da Empresa' },
  { key: 'gmail',     label: 'Gmail' },
  { key: 'telefonia', label: 'Telefonia' },
  { key: 'carteira',  label: 'Carteira' },
  { key: 'idioma',    label: 'Idioma' },
  { key: 'aparencia', label: 'Aparência' },
  { key: 'plano',     label: 'Assinatura' },
]

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TX_LABELS: Record<string, string> = {
  recharge:       'Recarga',
  bonus:          'Bônus',
  welcome:        'Bônus boas-vindas',
  call:           'Ligação',
  analysis:       'Análise de IA',
  leads_purchase: 'Compra de leads',
}

const TX_CREDITS = new Set(['recharge', 'bonus', 'welcome'])

function WalletSection({ balance, transactions }: { balance: number; transactions: WalletTransaction[] }) {
  const insufficient = balance < 0.20
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">Carteira</h2>
        <p className="mt-1 text-sm text-on-surface-muted">Seus créditos para ligações e análises de IA.</p>
      </div>

      {/* Saldo atual */}
      <div className={`rounded-xl border p-6 shadow-card ${insufficient ? 'border-red-300 bg-red-50' : 'border-outline bg-surface-container'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">Saldo atual</p>
        <p className={`mt-1 text-3xl font-bold ${insufficient ? 'text-red-600' : 'text-on-surface'}`}>
          R$ {formatBRL(balance)}
        </p>
        {insufficient && (
          <p className="mt-1 text-sm text-red-500">Saldo insuficiente — recarregue para continuar fazendo ligações.</p>
        )}
      </div>

      {/* Recarga */}
      <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
        <p className="text-sm font-semibold text-on-surface">Recarregar créditos</p>
        <p className="mt-1 text-sm text-on-surface-muted">Pagamento por PIX disponível em breve.</p>
        <button
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-lg bg-surface-low px-4 py-2.5 text-sm font-medium text-on-surface-muted"
        >
          PIX — Em breve
        </button>
      </div>

      {/* Extrato */}
      {transactions.length > 0 && (
        <div className="rounded-xl border border-outline bg-surface-container shadow-card overflow-hidden">
          <div className="border-b border-outline px-5 py-4">
            <p className="text-sm font-semibold text-on-surface">Extrato</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/50 bg-surface-low">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-muted">Descrição</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-on-surface-muted">Valor</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-on-surface-muted hidden sm:table-cell">Saldo após</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-on-surface-muted hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/30">
              {transactions.map((tx) => {
                const isCredit = TX_CREDITS.has(tx.type)
                return (
                  <tr key={tx.id} className="hover:bg-surface-low/50">
                    <td className="px-4 py-3 text-on-surface">
                      <span className="font-medium">{TX_LABELS[tx.type] ?? tx.type}</span>
                      {tx.description && (
                        <span className="ml-1.5 text-xs text-on-surface-muted">{tx.description}</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                      {isCredit ? '+' : '-'}R$ {formatBRL(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-muted tabular-nums hidden sm:table-cell">
                      R$ {formatBRL(tx.balance_after)}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-muted hidden sm:table-cell">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {transactions.length === 0 && (
        <p className="text-center text-sm text-on-surface-muted py-4">Nenhuma movimentação ainda.</p>
      )}
    </div>
  )
}

type Props = { searchParams: Promise<{ section?: string }> }

export default async function SettingsPage({ searchParams }: Props) {
  const { section: raw = 'empresa' } = await searchParams
  const section: Section = (SECTIONS.some((s) => s.key === raw) ? raw : 'empresa') as Section

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [company, gmailConnection, gmailRequest, telephonySettings, walletBalance, walletTransactions, assignedNumber] = await Promise.all([
    getCompanyProfileByUserId(supabase, user.id),
    getGmailConnection(supabase, user.id),
    getGmailRequest(supabase, user.id),
    getTelephonySettings(supabase, user.id),
    section === 'carteira' ? getBalance(supabase, user.id) : Promise.resolve(0),
    section === 'carteira' ? getTransactions(supabase, user.id, 30) : Promise.resolve([]),
    section === 'telefonia' && process.env.TELEPHONY_PROVIDER === 'telnyx'
      ? getAssignedNumber(supabase, user.id)
      : Promise.resolve(null),
  ])

  const availableNumbers = (section === 'telefonia' && process.env.TELEPHONY_PROVIDER === 'telnyx' && !assignedNumber)
    ? await getAvailableNumbers(supabase)
    : []

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

        {/* Telefonia */}
        {section === 'telefonia' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">Telefonia</h2>
              <p className="mt-1 text-sm text-on-surface-muted">
                {process.env.TELEPHONY_PROVIDER === 'telnyx'
                  ? 'Ligações gerenciadas pela plataforma via Telnyx.'
                  : 'Configure suas credenciais Twilio para realizar ligações diretamente pelo Prospecta.'}
              </p>
            </div>
            {process.env.TELEPHONY_PROVIDER === 'telnyx' ? (
              !assignedNumber ? (
                <NumberClaimForm availableNumbers={availableNumbers} />
              ) : (!company?.cpf_cnpj || !company?.forwarding_cell_phone) ? (
                <ForwardingDetailsForm />
              ) : (
                <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Seu número Prospecta</p>
                    <p className="mt-1 text-lg font-bold text-on-surface">{assignedNumber.phone_number}</p>
                    <p className="mt-1 text-sm text-on-surface-muted">
                      Ligações recebidas de leads são encaminhadas pro celular cadastrado em Dados da Empresa.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
                <TelephonySettingsForm initialData={telephonySettings} />
              </div>
            )}
          </div>
        )}

        {/* Carteira */}
        {section === 'carteira' && (
          <WalletSection balance={walletBalance} transactions={walletTransactions} />
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
