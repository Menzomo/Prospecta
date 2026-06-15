import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateCreateForm } from '@/features/templates/components/TemplateCreateForm'

type Props = { searchParams: Promise<{ returnTo?: string; step?: string }> }

export default async function NewTemplatePage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { returnTo, step } = await searchParams
  const backHref = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : '/templates'
  const returnToFull = returnTo && step
    ? `${returnTo}?step=${step}`
    : returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : null

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700">
            ← {returnTo ? 'Voltar' : 'Templates'}
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Novo template</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <TemplateCreateForm returnTo={returnToFull ?? undefined} />
          </div>
        </div>
      </main>
    </>
  )
}
