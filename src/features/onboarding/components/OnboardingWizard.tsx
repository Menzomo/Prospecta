'use client'

import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { onboardingAction } from '@/app/onboarding/actions'
import { requestGmailAccessAction } from '@/features/gmail/actions'
import { SidebarSpotlight } from '@/features/onboarding/components/SidebarSpotlight'
import { collapseStateName } from '@/utils/stateUtils'
import type { GmailRequestStatus } from '@/types/gmail'

type Category = { id: string; name: string }

const TOTAL_STEPS = 11

const INPUT_CLASS =
  'w-full rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:py-2.5'

const BTN_PRIMARY =
  'w-full cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:py-3'

const BTN_SECONDARY =
  'w-full cursor-pointer rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface-muted transition-colors hover:bg-surface-low sm:py-3'

interface Props {
  initialStep?: number
  categories: Category[]
  gmailRequestStatus?: GmailRequestStatus
  firstAvailableCity?: { city: string; state: string | null }
}

export function OnboardingWizard({ initialStep = 1, categories, gmailRequestStatus = 'not_requested', firstAvailableCity }: Props) {
  const lockedCity = firstAvailableCity
    ? { name: firstAvailableCity.city, state: collapseStateName(firstAvailableCity.state ?? '') }
    : { name: 'Caxias do Sul', state: 'RS' }
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

  useEffect(() => {
    if (state?.success) setStep(3)
  }, [state])

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 1))
  }

  const progressPct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)

  const containerWidth = 'max-w-md'

  // Forward arrow: blocked no passo 2 (formulário obrigatório) e no último passo
  const canGoPrev = step > 1
  const canGoNext = step !== 2 && step < TOTAL_STEPS

  const NAV_BTN =
    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-outline bg-surface-container text-on-surface-muted shadow-card transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:h-9 sm:w-9'

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface px-3 py-3 sm:px-4 sm:py-10">
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
            <span className="text-xs text-on-surface-muted">Etapa {step} de {TOTAL_STEPS}</span>
            <div className="flex-1" />
            <span className="text-xs text-on-surface-muted">{progressPct}%</span>
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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-low">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Etapa 1 — Boas-vindas ── */}
        {step === 1 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-8">
              <p className="mb-1 text-3xl sm:mb-3 sm:text-5xl">🚀</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-2xl">Bem-vindo ao Prospecta</h1>
              <p className="mt-1 text-xs leading-snug text-on-surface-muted sm:mt-2 sm:text-sm sm:leading-relaxed">
                Encontre empresas, envie emails e acompanhe suas prospecções em um único lugar.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 2 — Empresa ── */}
        {step === 2 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-3 sm:mb-6">
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Configure sua empresa</h1>
              <p className="mt-0.5 text-xs text-on-surface-muted sm:mt-1 sm:text-sm">
                Essas informações serão usadas nos seus emails de prospecção.
              </p>
            </div>
            <form action={formAction} className="flex flex-col gap-2 sm:gap-4">
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="company_name" className="text-xs font-medium text-on-surface sm:text-sm">
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
                <label htmlFor="website" className="text-xs font-medium text-on-surface sm:text-sm">Website</label>
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
                  <label htmlFor="city" className="text-xs font-medium text-on-surface sm:text-sm">Cidade</label>
                  <input id="city" name="city" type="text" placeholder="Ex: São Paulo" className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <label htmlFor="phone" className="text-xs font-medium text-on-surface sm:text-sm">Telefone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(11) 99999-9999" className={INPUT_CLASS} />
                </div>
              </div>

              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="commercial_email" className="text-xs font-medium text-on-surface sm:text-sm">Email comercial</label>
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
                <label htmlFor="description" className="text-xs font-medium text-on-surface sm:text-sm">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="O que sua empresa faz?"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:py-2.5"
                />
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 sm:text-sm">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
              >
                {pending ? 'Salvando...' : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {/* ── Etapa 3 — Nicho e Cidade ── */}
        {step === 3 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-8">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🎯</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Nicho e Cidade</h1>
              <p className="mt-1 text-xs leading-snug text-on-surface-muted sm:mt-3 sm:text-sm sm:leading-relaxed">
                No Prospecta você encontra leads escolhendo um nicho e uma cidade — empresas do segmento e região certos para o seu negócio.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 4 — O que você tem no Prospecta ── */}
        {step === 4 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-3 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🎁</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">O que você tem no Prospecta</h1>
              <p className="mt-0.5 text-xs text-on-surface-muted sm:mt-1 sm:text-sm">Um CRM completo pra encontrar leads e fechar negócio.</p>
            </div>
            <div className="mb-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:mb-4 sm:p-4">
              <p className="mb-1.5 text-xs font-semibold text-primary sm:text-sm">No seu CRM você encontra:</p>
              <ul className="space-y-1 text-xs text-primary/80 sm:text-sm">
                <li>✓ Busca de leads por nicho e cidade</li>
                <li>✓ Envio de emails com templates reutilizáveis</li>
                <li>✓ Acompanhamento de respostas e follow-ups</li>
                <li>✓ Ligações direto pelo CRM, com análise por IA</li>
              </ul>
            </div>
            <div className="mb-3 rounded-xl border border-outline p-3 sm:mb-6 sm:p-4">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-on-surface-muted">Assinatura</p>
              <p className="text-xs font-semibold text-on-surface sm:text-sm">Prospecta</p>
              <p className="text-base font-bold text-on-surface sm:text-lg">
                R$ 150,00<span className="text-xs font-normal text-on-surface-muted sm:text-sm">/mês</span>
              </p>
              <p className="mt-1 text-xs text-on-surface-muted">
                Além da assinatura, você pode carregar saldo na carteira via Pix pra pagar ligações e análises de IA conforme for usando.
              </p>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 5 — Templates ── */}
        {step === 5 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">✉️</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Templates de Email</h1>
            </div>
            <div className="mb-4 sm:mb-6">
              <SidebarSpotlight
                highlight="templates"
                title="Crie modelos reutilizáveis"
                description="Monte modelos de email prontos, com variáveis como nome do lead e o nome da sua empresa, pra economizar tempo na prospecção. Você encontra essa opção no menu Templates quando quiser criar o primeiro."
              />
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 6 — Buscar Leads ── */}
        {step === 6 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🔍</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Buscar Leads</h1>
            </div>
            <div className="mb-4 sm:mb-6">
              <SidebarSpotlight
                highlight="search"
                title="Encontre empresas por nicho e cidade"
                description={`Escolha uma categoria e uma cidade pra descobrir empresas disponíveis pra prospecção. Por enquanto a busca está liberada só pra ${lockedCity.name}, mas a gente já está trabalhando pra chegar em mais cidades.`}
              >
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-outline bg-surface-low p-3">
                  <div>
                    <p className="text-xs font-medium text-on-surface-muted">Categoria</p>
                    <div className="mt-1 rounded-md border border-outline bg-surface-container px-2.5 py-1.5 text-xs text-on-surface-muted">
                      Ex: {categories[0]?.name ?? 'Restaurantes'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-on-surface-muted">Cidade</p>
                    <div className="mt-1 rounded-md border border-outline bg-surface-container px-2.5 py-1.5 text-xs text-on-surface">
                      {lockedCity.name} - {lockedCity.state}
                    </div>
                  </div>
                </div>
              </SidebarSpotlight>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 7 — Leads ── */}
        {step === 7 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">📋</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Gerencie seus Leads</h1>
            </div>
            <div className="mb-4 sm:mb-6">
              <SidebarSpotlight
                highlight="leads"
                title="Tudo organizado num só lugar"
                description="Os leads que você encontrar em Buscar Leads ficam aqui, organizados por status — Novo, Em Contato e Convertido — pra você acompanhar o funil de prospecção."
              >
                <div className="mt-3 flex flex-col gap-1.5 rounded-lg border border-outline bg-surface-low p-3">
                  {['Novo', 'Em Contato', 'Convertido'].map((label, i) => (
                    <div key={label} className="flex items-center gap-2 rounded-md border border-outline bg-surface-container px-2 py-1.5">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-primary/30" />
                      <div className="flex-1 select-none blur-[3px]">
                        <p className="text-xs font-medium text-on-surface">Empresa Exemplo {i + 1}</p>
                        <p className="text-[10px] text-on-surface-muted">Categoria · Cidade</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">{label}</span>
                    </div>
                  ))}
                </div>
              </SidebarSpotlight>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 8 — Acompanhamentos ── */}
        {step === 8 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">🔔</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Acompanhamentos</h1>
            </div>
            <div className="mb-4 sm:mb-6">
              <SidebarSpotlight
                highlight="followups"
                title="Nunca perca o timing de um follow-up"
                description="Em cada lead você pode criar acompanhamentos — lembretes pra ligar de novo, enviar uma proposta, cobrar uma resposta. Cada um que você criar aparece na aba Acompanhamentos e também no seu Dashboard."
              >
                <div className="mt-3 flex flex-col gap-2">
                  <div className="rounded-lg border border-outline bg-surface-low p-2.5">
                    <p className="text-[10px] font-semibold text-on-surface-muted">Novo acompanhamento</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      <div className="rounded-md border border-outline bg-surface-container px-2 py-1 text-[10px] text-on-surface-muted">
                        Título — Ex: Ligar para apresentar proposta
                      </div>
                      <div className="rounded-md border border-outline bg-surface-container px-2 py-1 text-[10px] text-on-surface-muted">
                        Data prevista
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-outline bg-surface-low px-2.5 py-2">
                    <div className="h-6 w-6 shrink-0 rounded-full bg-primary/30" />
                    <div className="flex-1 select-none blur-[3px]">
                      <p className="text-xs font-medium text-on-surface">Empresa Exemplo</p>
                      <p className="text-[10px] text-on-surface-muted">Abordar possibilidade de teste grátis</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">Pendente</span>
                  </div>
                </div>
              </SidebarSpotlight>
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 9 — Gmail ── */}
        {step === 9 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">📧</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Conecte seu Gmail</h1>
              <p className="mt-1 text-xs leading-snug text-on-surface-muted sm:mt-2 sm:text-sm sm:leading-relaxed">
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
                  className="block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:py-3"
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
                  <label htmlFor="gmail_request" className="text-xs font-medium text-on-surface sm:text-sm">
                    Gmail que deseja utilizar
                  </label>
                  <input
                    id="gmail_request"
                    type="email"
                    placeholder="usuario@gmail.com"
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGmailRequest()}
                    className="w-full rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {gmailRequestError && (
                    <p className="text-xs text-red-500">{gmailRequestError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGmailRequest}
                  disabled={gmailRequesting || !gmailInput.trim()}
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                >
                  {gmailRequesting ? 'Enviando...' : 'Solicitar liberação'}
                </button>
                <button onClick={next} className={BTN_SECONDARY}>Fazer depois</button>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 10 — Assinatura ── */}
        {step === 10 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 shadow-card sm:rounded-2xl sm:p-8">
            <div className="mb-4 text-center sm:mb-6">
              <p className="mb-1 text-2xl sm:mb-3 sm:text-4xl">💳</p>
              <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-xl">Ative sua assinatura</h1>
            </div>
            <div className="mb-4 sm:mb-6">
              <SidebarSpotlight
                highlight="settings"
                title="Disponível em Configurações, quando quiser"
                description="Assine o Prospecta por R$150/mês em Configurações → Assinatura. Ao assinar, você escolhe um número de telefone dedicado do Prospecta pra ligar pros seus leads e receber ligações de volta deles."
                subItems={[
                  { label: 'Dados da Empresa' },
                  { label: 'Gmail' },
                  { label: 'Carteira' },
                  { label: 'Assinatura', active: true },
                ]}
              />
            </div>
            <button onClick={next} className={BTN_PRIMARY}>Continuar</button>
          </div>
        )}

        {/* ── Etapa 11 — Finalização ── */}
        {step === 11 && (
          <div className="rounded-xl border border-outline bg-surface-container p-4 text-center shadow-card sm:rounded-2xl sm:p-8">
            <p className="mb-1 text-3xl sm:mb-3 sm:text-5xl">🚀</p>
            <h1 className="text-base font-bold text-on-surface font-[--font-heading] sm:text-2xl">Tudo pronto!</h1>
            <p className="mt-1 mb-4 text-xs text-on-surface-muted sm:mt-2 sm:mb-8 sm:text-sm">
              Seu Prospecta está configurado e pronto para uso.
            </p>
            <Link
              href="/dashboard"
              className="block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:py-3"
            >
              Ir para Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
