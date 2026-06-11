'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ApifyImportJob } from '@/repositories/apifyImportJobRepository'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  running: 'Executando',
  processing: 'Processando',
  succeeded: 'Concluído',
  failed: 'Falhou',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

interface Props {
  jobs: ApifyImportJob[]
}

export function AdminImportJobsList({ jobs: initial }: Props) {
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncMessages, setSyncMessages] = useState<Record<string, string>>({})
  const router = useRouter()
  const [, startTransition] = useTransition()

  async function handleSync(jobId: string) {
    setSyncing(jobId)
    setSyncMessages((prev) => ({ ...prev, [jobId]: '' }))

    try {
      const res = await fetch(`/api/admin/import-apify/jobs/${jobId}/sync`, { method: 'POST' })
      const data = await res.json() as { message?: string; error?: string; summary?: Record<string, number> }
      const msg = data.message ?? data.error ?? 'Resposta inesperada'
      setSyncMessages((prev) => ({ ...prev, [jobId]: msg }))

      startTransition(() => router.refresh())
    } catch {
      setSyncMessages((prev) => ({ ...prev, [jobId]: 'Falha na requisição' }))
    } finally {
      setSyncing(null)
    }
  }

  if (initial.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Importações Recentes</h2>
        <p className="text-sm text-gray-400">Nenhuma importação realizada ainda.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Importações Recentes</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Nicho</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Cidade</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Qtd</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Importados</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Duplic.</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Email</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Data</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initial.map((job) => {
              const isTerminal = job.status === 'succeeded' || job.status === 'failed'
              const isSyncing = syncing === job.id
              const msg = syncMessages[job.id]

              return (
                <tr key={job.id}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{job.category_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{job.city}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{job.requested_limit}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status] ?? STATUS_COLOR.pending}`}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{job.imported_count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{job.skipped_duplicate_count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{job.email_found_count}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!isTerminal && (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleSync(job.id)}
                          disabled={isSyncing}
                          className="cursor-pointer rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSyncing ? 'Atualizando...' : 'Atualizar status'}
                        </button>
                        {msg && <span className="text-xs text-gray-500">{msg}</span>}
                      </div>
                    )}
                    {job.status === 'failed' && job.error_message && (
                      <span className="text-xs text-red-500" title={job.error_message}>Erro</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
