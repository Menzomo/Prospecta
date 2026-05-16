import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingFollowupsByUserId } from '@/repositories/followupRepository'
import { completeFollowupAction } from '@/features/followups/actions'

function formatDueAt(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date()
}

export default async function FollowupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const followups = await getPendingFollowupsByUserId(supabase, user.id)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Acompanhamentos</h1>
          <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700">
            ← Leads
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg">
          {followups.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-gray-700">Nenhum acompanhamento pendente.</p>
              <p className="mt-1 text-sm text-gray-400">
                Crie acompanhamentos a partir da página de um lead.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {followups.map((followup) => {
                const overdue = isOverdue(followup.due_at)
                const leadName = followup.leads?.company_name ?? 'Lead'

                return (
                  <div
                    key={followup.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/leads/${followup.lead_id}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {leadName}
                        </Link>
                        <p className="mt-1 truncate text-sm font-medium text-gray-800">
                          {followup.title}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-500'}`}
                        >
                          {overdue ? 'Atrasado · ' : ''}{formatDueAt(followup.due_at)}
                        </p>
                        {followup.notes && (
                          <p className="mt-1 text-xs text-gray-500">{followup.notes}</p>
                        )}
                      </div>

                      <form
                        action={completeFollowupAction.bind(null, followup.id, followup.lead_id)}
                      >
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                        >
                          Concluir
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
