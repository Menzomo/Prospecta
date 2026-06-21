import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listTemplates } from '@/repositories/templateRepository'
import { PageHeader } from '@/components/layout/PageHeader'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const templates = await listTemplates(supabase, user.id)

  return (
    <main className="flex flex-col gap-5 p-6">
      <PageHeader
        title="Templates"
        subtitle="Modelos de email para sua prospecção"
        actions={
          <Link
            href="/templates/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark active:scale-95"
          >
            + Novo template
          </Link>
        }
      />

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-on-surface-muted">Nenhum template criado ainda.</p>
          <Link href="/templates/new" className="mt-3 text-sm text-primary hover:underline">
            Criar seu primeiro template
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-on-surface-muted">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-outline bg-surface-container p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-on-surface">{template.name}</p>
                  <p className="shrink-0 text-xs text-on-surface-muted">
                    {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="mt-1 truncate text-sm text-on-surface-muted">{template.subject}</p>
                <div className="mt-3">
                  <Link
                    href={`/templates/${template.id}`}
                    className="inline-block rounded-lg border border-outline px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-low"
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
  )
}
