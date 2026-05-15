import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTemplateById } from '@/repositories/templateRepository'
import { deleteTemplateAction } from '@/features/templates/actions'
import { TemplateEditForm } from '@/features/templates/components/TemplateEditForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const template = await getTemplateById(supabase, id)
  if (!template) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700">
              ← Templates
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
          </div>

          <form action={deleteTemplateAction.bind(null, template.id)}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Excluir template
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Editar template</h2>
            <TemplateEditForm template={template} />
          </div>
        </div>
      </main>
    </div>
  )
}
