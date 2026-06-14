import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listTemplates } from '@/repositories/templateRepository'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const templates = await listTemplates(supabase, user.id)

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Templates</h1>
          <Link
            href="/templates/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Novo template
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-6">
        {templates.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">Nenhum template criado ainda.</p>
            <Link href="/templates/new" className="mt-3 text-sm text-blue-600 hover:underline">
              Criar seu primeiro template
            </Link>
          </div>
        ) : (
          <>
            {/* ── Desktop: table ── */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Assunto</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Atualizado em</th>
                    <th className="px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{template.name}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                        {template.subject}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/templates/${template.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile: cards ── */}
            <div className="space-y-3 md:hidden">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900">{template.name}</p>
                    <p className="shrink-0 text-xs text-gray-400">
                      {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">{template.subject}</p>
                  <div className="mt-3">
                    <Link
                      href={`/templates/${template.id}`}
                      className="inline-block rounded-md bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
