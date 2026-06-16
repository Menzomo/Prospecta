'use client'

import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { onboardingAction } from '@/app/onboarding/actions'
import { SearchForm } from '@/features/search/components/SearchForm'

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
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

const BTN_PRIMARY =
  'w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700'

const BTN_SECONDARY =
  'w-full cursor-pointer rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50'

interface Props {
  initialStep?: number
  categories: Category[]
}

export function OnboardingWizard({ initialStep = 1, categories }: Props) {
  const [step, setStep] = useState(initialStep)
  const [state, formAction, pending] = useActionState(onboardingAction, null)

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
    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none'

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10">
      <div className={`w-full ${containerWidth}`}>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={!canGoPrev}
              aria-label="Etapa anterior"
              className={NAV_BTN}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <p className="mb-3 text-5xl">🚀</p>
              <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Prospecta</h1>
              <p className="mt-2 text-sm text-gray-500">
                Encontre empresas, envie emails e acompanhe suas prospecções em um único lugar.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 2 — Empresa ── */}
        {step === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Configure sua empresa</h1>
              <p className="mt-1 text-sm text-gray-500">
                Essas informações serão usadas nos seus emails de prospecção.
              </p>
            </div>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="company_name" className="text-sm font-medium text-gray-700">
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

              <div className="flex flex-col gap-1">
                <label htmlFor="website" className="text-sm font-medium text-gray-700">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  placeholder="https://empresa.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="city" className="text-sm font-medium text-gray-700">Cidade</label>
                  <input id="city" name="city" type="text" placeholder="Ex: São Paulo" className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(11) 99999-9999" className={INPUT_CLASS} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="commercial_email" className="text-sm font-medium text-gray-700">Email comercial</label>
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

              <div className="flex flex-col gap-1">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="O que sua empresa faz?"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Salvando...' : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {/* ── Etapa 3 — Nicho e Cidade ── */}
        {step === 3 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <p className="mb-3 text-4xl">🎯</p>
              <h1 className="text-xl font-bold text-gray-900">Nicho e Cidade</h1>
              <p className="mt-3 text-sm text-gray-500">
                No Prospecta, você encontra leads escolhendo um nicho e uma cidade. Assim você consegue prospectar empresas dentro do segmento e região que fazem sentido para o seu negócio.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 4 — Plano Beta ── */}
        {step === 4 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <p className="mb-3 text-4xl">🎁</p>
              <h1 className="text-xl font-bold text-gray-900">Seu acesso Beta</h1>
              <p className="mt-1 text-sm text-gray-500">Você recebeu acesso ao Prospecta Beta.</p>
            </div>
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-800">Durante o período de testes você possui:</p>
              <ul className="space-y-1.5 text-sm text-blue-700">
                <li>✓ 20 leads gratuitos</li>
                <li>✓ Templates de email</li>
                <li>✓ Gestão de leads</li>
                <li>✓ Acompanhamentos</li>
              </ul>
            </div>
            <div className="mb-6 rounded-xl border border-gray-200 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Plano futuro</p>
              <p className="text-sm font-semibold text-gray-900">Prospecta Starter</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900">
                R$ 49,90<span className="text-sm font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-xs text-gray-500">200 leads por mês</p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 5 — Templates ── */}
        {step === 5 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <p className="mb-3 text-4xl">✉️</p>
              <h1 className="text-xl font-bold text-gray-900">Templates de Email</h1>
              <p className="mt-3 text-sm text-gray-500">
                Os templates ajudam você a criar mensagens reutilizáveis para enviar emails mais rápido. Crie seu primeiro template agora ou faça isso depois.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/templates/new?returnTo=/onboarding&step=6"
                className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
            <div className="mb-5 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
              <p className="text-xl font-bold text-gray-900">Buscar Leads</p>
              <p className="mt-1 text-sm text-gray-500">
                Selecione um nicho e uma cidade, busque empresas e adicione pelo menos {MIN_LEADS} leads para continuar.
              </p>
            </div>

            <SearchForm
              categories={categories}
              onConfirmed={(added) => setTotalLeadsAdded((n) => n + added)}
              lockedCity={{ name: 'Caxias do Sul', state: 'RS' }}
              betaLimit={20}
            />

            <div className="mt-4 flex flex-col gap-2">
              {totalLeadsAdded > 0 && totalLeadsAdded < MIN_LEADS && (
                <p className="text-center text-sm text-amber-600">
                  {totalLeadsAdded}/{MIN_LEADS} leads adicionados — adicione mais para continuar.
                </p>
              )}
              <button
                onClick={next}
                disabled={totalLeadsAdded < MIN_LEADS}
                className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── Etapa 7 — Leads Adicionados ── */}
        {step === 7 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-5">
              <p className="text-xl font-bold text-gray-900">Seus Leads</p>
              <p className="mt-1 text-sm text-gray-500">
                Esses são os leads que você acabou de adicionar. Eles estarão disponíveis na área de Leads.
              </p>
            </div>

            {loadingLeads ? (
              <p className="py-6 text-center text-sm text-gray-400">Carregando leads...</p>
            ) : recentLeads.length === 0 ? (
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">
                  Nenhum lead adicionado ainda. Você pode buscar leads a qualquer momento na área de Busca.
                </p>
              </div>
            ) : (
              <div className="mb-6 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="font-semibold text-gray-900">{lead.company_name}</p>
                      <div className="mt-1 space-y-0.5 text-sm text-gray-500">
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
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <p className="mb-3 text-4xl">📧</p>
              <h1 className="text-xl font-bold text-gray-900">Conecte seu Gmail</h1>
              <p className="mt-2 text-sm text-gray-500">
                Conecte sua conta Gmail para enviar emails diretamente pelo Prospecta.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="/api/gmail/connect"
                className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Conectar Gmail
              </a>
              <button onClick={next} className={BTN_SECONDARY}>Fazer depois</button>
            </div>
          </div>
        )}

        {/* ── Etapa 9 — Finalização ── */}
        {step === 9 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <p className="mb-3 text-5xl">🚀</p>
            <h1 className="text-2xl font-bold text-gray-900">Tudo pronto!</h1>
            <p className="mt-2 mb-8 text-sm text-gray-500">
              Seu Prospecta está configurado e pronto para uso.
            </p>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Ir para Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
