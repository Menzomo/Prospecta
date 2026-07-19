import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateCreateForm } from '@/features/templates/components/TemplateCreateForm'
import { hasActiveSubscription } from '@/repositories/profileRepository'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'

type Props = { searchParams: Promise<{ returnTo?: string; step?: string }> }

export default async function NewTemplatePage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const canWrite = await hasActiveSubscription(supabase, user.id)

  const { returnTo, step } = await searchParams
  const safeReturnTo =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null
  const returnToFull = safeReturnTo && step ? `${safeReturnTo}?step=${step}` : safeReturnTo

  // When coming from onboarding, render a fullscreen overlay so the main nav is hidden
  if (returnToFull) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-6 py-4">
          <span className="text-sm font-bold text-blue-600">Prospecta</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">Configuração inicial</span>
          <Link
            href={returnToFull}
            className="ml-auto text-sm text-blue-600 hover:underline"
          >
            ← Voltar ao onboarding
          </Link>
        </div>
        <div className="flex flex-1 justify-center overflow-auto p-6">
          <div className="w-full max-w-lg">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              {canWrite ? <TemplateCreateForm returnTo={returnToFull} /> : <SubscriptionGateCard />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700">
            ← Templates
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Novo template</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {canWrite ? <TemplateCreateForm /> : <SubscriptionGateCard />}
          </div>
        </div>
      </main>
    </>
  )
}
