'use client'

import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { onboardingAction } from '@/app/onboarding/actions'
import { requestGmailAccessAction } from '@/features/gmail/actions'
import { SearchForm } from '@/features/search/components/SearchForm'
import type { GmailRequestStatus } from '@/types/gmail'

type Category = { id: string; name: string }

type RecentLead = {
  id: string
  company_name: string
  email: string | null
  city: string | null
  category_id: string | null
  status: string
}

const TOTAL_STEPS = 9

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:py-2.5'

const BTN_PRIMARY =
  'w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:py-3'

const BTN_SECONDARY =
  'w-full cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:py-3'

interface Props {
  initialStep?: number
  categories: Category[]
  gmailRequestStatus?: GmailRequestStatus
}

export function OnboardingWizard({ initialStep = 1, categories, gmailRequestStatus = 'not_requested' }: Props) {
  const [step, setStep] = useState(initialStep)
  const [state, formAction, pending] = useActionState(onboardingAction, null)

  // Step 8 Gmail request state
  const [gmailInput, setGmailInput] = useState('')
  const [gmailRequesting, setGmailRequesting] = useState(false)
  const [gmailRequestError, setGmailRequestError] = useState<string | null>(null)
  const [gmailJustRequested, setGmailJustRequested] = useState(false)

  async function handleGmailRequest() {
    if (!gmailInput.trim()) return
    setGmailRequesting(true)
    setGmailRequestError(null)
    const result = await requestGmailAccessAction(gmailInput.trim())
    setGmailRequesting(false)
    if (result.error) {
      setGmailRequestError(result.error)
    } else {
      setGmailJustRequested(true)
    }
  }

  // Step 6 state — accumulates across multiple confirm actions
  const [totalLeadsAdded, setTotalLeadsAdded] = useState(0)
  const MIN_LEADS = 5

  // Step 7 state
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  useEffect(() => {
    if (state?.success) setStep(3)
  }, [state])

  useEffect(() => {
    if (step === 7) {
      setLoadingLeads(true)
      fetch('/api/user-leads')
        .then((r) => r.json())
        .then((data) => setRecentLeads((data as { leads: RecentLead[] }).leads ?? []))
        .catch(() => {})
        .finally(() => setLoadingLeads(false))
    }
  }, [step])

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 1))
  }

  const progressPct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)

  // Step 6 uses wider max-width to accommodate the search form
  const containerWidth = step === 6 ? 'max-w-2xl' : 'max-w-md'

  // Forward arrow: blocked on step 2 (form required), step 6 (< 5 leads), and last step
  const canGoPrev = step > 1
  const canGoNext =
    step !== 2 &&
    step < TOTAL_STEPS &&
    !(step === 6 && totalLeadsAdded < MIN_LEADS)

  const NAV_BTN =
    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:h-9 sm:w-9'

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-3 py-3 sm:px-4 sm:py-10">
      <div className={`w-full ${containerWidth}`}>

        {/* Progress bar */}
        <div className="mb-3 sm:mb-6">
          <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
            <button
              type="button"
              onClick={prev}
              disabled={!canGoPrev}
              aria-label="Etapa anterior"
              className={NAV_BTN}
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-gray-500">Etapa {step} de {TOTAL_STEPS}</span>
            <div className="flex-1" />
            <span className="text-xs text-gray-500">{progressPct}%</span>
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext}
              aria-label="Próxima etapa"
              className={NAV_BTN}
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Etapa 1 — Boas-vindas ── */}
        {step === 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-8">
              <p className="mb-1 text-3xl sm:mb-3 sm:text-5xl">🚀</p>
              <h1 className="text-base font-bold text-gray-900 sm:text-2xl">Bem-vindo ao Prospecta</h1>
              <p className="mt-1 text-xs leading-snug text-gray-500 sm:mt-2 sm:text-sm sm:leading-relaxed">
                Encontre empresas, envie emails e acompanhe suas prospecções em um único lugar.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 2 — Empresa ── */}
        {step === 2 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-3 sm:mb-6">
              <h1 className="text-base font-bold text-gray-900 sm:text-xl">Configure sua empresa</h1>
              <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                Essas informações serão usadas nos seus emails de prospecção.
              </p>
            </div>
            <form action={formAction} className="flex flex-col gap-2 sm:gap-4">
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="company_name" className="text-xs font-medium text-gray-700 sm:text-sm">
                  Nome da empresa <span className="text-red-500">*</span>
                </label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  placeholder="Ex: Minha Empresa Ltda"
                  className={INPUT_CLASS}
                />
                {state?.errors?.company_name && (
                  <p className="text-xs text-red-500">{state.errors.company_name[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="website" className="text-xs font-medium text-gray-700 sm:text-sm">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  placeholder="https://empresa.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <label htmlFor="city" className="text-xs font-medium text-gray-700 sm:text-sm">Cidade</label>
                  <input id="city" name="city" type="text" placeholder="Ex: São Paulo" className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <label htmlFor="phone" className="text-xs font-medium text-gray-700 sm:text-sm">Telefone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(11) 99999-9999" className={INPUT_CLASS} />
                </div>
              </div>

              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="commercial_email" className="text-xs font-medium text-gray-700 sm:text-sm">Email comercial</label>
                <input
                  id="commercial_email"
                  name="commercial_email"
                  type="email"
                  placeholder="contato@empresa.com"
                  className={INPUT_CLASS}
                />
                {state?.errors?.commercial_email && (
                  <p className="text-xs text-red-500">{state.errors.commercial_email[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="description" className="text-xs font-medium text-gray-700 sm:text-sm">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="O que sua empresa faz?"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:py-2.5"
                />
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 sm:text-sm">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
              >
                {pending ? 'Salvando...' : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {/* ── Etapa 3 — Nicho e Cidade ── */}
        {step === 3 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-8">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🎯</p>
              <h1 className="text-base font-bold text-gray-900 sm:text-xl">Nicho e Cidade</h1>
              <p className="mt-1 text-xs leading-snug text-gray-500 sm:mt-3 sm:text-sm sm:leading-relaxed">
                No Prospecta você encontra leads escolhendo um nicho e uma cidade — empresas do segmento e região certos para o seu negócio.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 4 — Plano Beta ── */}
        {step === 4 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-3 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🎁</p>
              <h1 className="text-base font-bold text-gray-900 sm:text-xl">Seu acesso Beta</h1>
              <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">Você recebeu acesso ao Prospecta Beta.</p>
            </div>
            <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:mb-4 sm:p-4">
              <p className="mb-1.5 text-xs font-semibold text-blue-800 sm:text-sm">Durante o período de testes você possui:</p>
              <ul className="space-y-1 text-xs text-blue-700 sm:text-sm">
                <li>✓ 20 leads gratuitos</li>
                <li>✓ Templates de email</li>
                <li>✓ Gestão de leads</li>
                <li>✓ Acompanhamentos</li>
              </ul>
            </div>
            <div className="mb-3 rounded-xl border border-gray-200 p-3 sm:mb-6 sm:p-4">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">Plano futuro</p>
              <p className="text-xs font-semibold text-gray-900 sm:text-sm">Prospecta Starter</p>
              <p className="text-base font-bold text-gray-900 sm:text-lg">
                R$ 49,90<span className="text-xs font-normal text-gray-500 sm:text-sm">/mês</span>
              </p>
              <p className="text-xs text-gray-500">200 leads por mês</p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 5 — Templates ── */}
        {step === 5 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">✉️</p>
              <h1 className="text-base font-bold text-gray-900 sm:text-xl">Templates de Email</h1>
              <p className="mt-1 text-xs leading-snug text-gray-500 sm:mt-2 sm:text-sm sm:leading-relaxed">
                Crie modelos reutilizáveis para enviar emails mais rápido. Crie agora ou faça depois.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              <Link
                href="/templates/new?returnTo=/onboarding&step=6"
                className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:py-3"
              >
                Criar primeiro template
              </Link>
              <button onClick={next} className={BTN_SECONDARY}>Fazer depois</button>
            </div>
          </div>
        )}

        {/* ── Etapa 6 — Buscar Leads ── */}
        {step === 6 && (
          <div>
            <div className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:mb-5 sm:rounded-2xl sm:px-6 sm:py-5">
              <p className="text-base font-bold text-gray-900 sm:text-xl">Buscar Leads</p>
              <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                Selecione um nicho e uma cidade, busque empresas e adicione pelo menos {MIN_LEADS} leads para continuar.
              </p>
            </div>

            <SearchForm
              categories={categories}
              onConfirmed={(added) => setTotalLeadsAdded((n) => n + added)}
              lockedCity={{ name: 'Caxias do Sul', state: 'RS' }}
              betaLimit={20}
            />

            <div className="mt-3 flex flex-col gap-2 sm:mt-4">
              {totalLeadsAdded > 0 && totalLeadsAdded < MIN_LEADS && (
                <p className="text-center text-xs text-amber-600 sm:text-sm">
                  {totalLeadsAdded}/{MIN_LEADS} leads adicionados — adicione mais para continuar.
                </p>
              )}
              <button
                onClick={next}
                disabled={totalLeadsAdded < MIN_LEADS}
                className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 7 — Leads Adicionados ── */}
        {step === 7 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-3 sm:mb-5">
              <p className="text-base font-bold text-gray-900 sm:text-xl">Seus Leads</p>
              <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                Esses são os leads que você adicionou. Estarão disponíveis na área de Leads.
              </p>
            </div>

            {loadingLeads ? (
              <p className="py-3 text-center text-xs text-gray-400 sm:py-6 sm:text-sm">Carregando leads...</p>
            ) : recentLeads.length === 0 ? (
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center sm:mb-6 sm:p-6">
                <p className="text-xs text-gray-500 sm:text-sm">
                  Nenhum lead adicionado ainda. Você pode buscar leads a qualquer momento na área de Busca.
                </p>
              </div>
            ) : (
              <div className="mb-3 max-h-[35vh] overflow-y-auto sm:mb-6 sm:max-h-[50vh]">
                <div className="grid grid-cols-1 gap-1.5 sm:gap-3">
                  {recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 sm:rounded-xl sm:p-4"
                    >
                      <p className="text-sm font-semibold text-gray-900">{lead.company_name}</p>
                      <div className="mt-0.5 space-y-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                        <p className="break-all">{lead.email ?? '—'}</p>
                        <p>{lead.city ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 8 — Gmail ── */}
        {step === 8 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">📧</p>
              <h1 className="text-base font-bold text-gray-900 sm:text-xl">Conecte seu Gmail</h1>
              <p className="mt-1 text-xs leading-snug text-gray-500 sm:mt-2 sm:text-sm sm:leading-relaxed">
                O Prospecta utiliza o Gmail para envio e acompanhamento de emails. Como estamos em fase beta, precisamos liberar sua conta antes da conexão.
              </p>
            </div>

            {/* connected */}
            {gmailRequestStatus === 'connected' && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
                  <span>✓</span>
                  <span>Gmail conectado</span>
                </div>
                <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
              </div>
            )}

            {/* approved — can connect now */}
            {gmailRequestStatus === 'approved' && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
                  <span>✓</span>
                  <span>Gmail liberado — você já pode conectar</span>
                </div>
                <a
                  href="/api/gmail/connect"
                  className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:py-3"
                >
                  Conectar Gmail
                </a>
                <button onClick={next} className={BTN_SECONDARY}>Fazer depois</button>
              </div>
            )}

            {/* pending — waiting or just submitted */}
            {(gmailRequestStatus === 'pending' || gmailJustRequested) && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  <p className="font-medium">⏳ Aguardando liberação</p>
                  <p className="mt-1 text-xs text-amber-700">Recebemos sua solicitação e estamos liberando sua conta para uso do Gmail. Você poderá continuar utilizando o Prospecta enquanto isso.</p>
                </div>
                <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
              </div>
            )}

            {/* not_requested — show form */}
            {gmailRequestStatus === 'not_requested' && !gmailJustRequested && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="gmail_request" className="text-xs font-medium text-gray-700 sm:text-sm">
                    Gmail que deseja utilizar
                  </label>
                  <input
                    id="gmail_request"
                    type="email"
                    placeholder="usuario@gmail.com"
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGmailRequest()}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {gmailRequestError && (
                    <p className="text-xs text-red-500">{gmailRequestError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGmailRequest}
                  disabled={gmailRequesting || !gmailInput.trim()}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                >
                  {gmailRequesting ? 'Enviando...' : 'Solicitar liberação'}
                </button>
                <button onClick={next} className={BTN_SECONDARY}>Fazer depois</button>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 9 — Finalização ── */}
        {step === 9 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm sm:rounded-2xl sm:p-8">
            <p className="mb-1 text-3xl sm:mb-3 sm:text-5xl">🚀</p>
            <h1 className="text-base font-bold text-gray-900 sm:text-2xl">Tudo pronto!</h1>
            <p className="mt-1 mb-4 text-xs text-gray-500 sm:mt-2 sm:mb-8 sm:text-sm">
              Seu Prospecta está configurado e pronto para uso.
            </p>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:py-3"
            >
              Ir para Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
