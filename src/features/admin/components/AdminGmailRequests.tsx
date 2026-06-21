'use client'

import { useState } from 'react'
import type { AdminGmailRequest } from '@/repositories/adminRepository'

type SyncResult = { users: number; synced: number; errors: number }

interface Props {
  requests: AdminGmailRequest[]
}

export function AdminGmailRequests({ requests }: Props) {
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)

    const res = await fetch('/api/admin/gmail-sync', { method: 'POST' })
    const data = await res.json().catch(() => ({})) as SyncResult & { error?: string }

    setSyncing(false)
    if (res.ok) {
      setSyncResult(data)
    } else {
      setSyncError(data.error ?? 'Erro ao sincronizar')
    }
  }

  async function handleApprove(userId: string) {
    setLoading(userId)
    setErrors((prev) => { const next = { ...prev }; delete next[userId]; return next })

    const res = await fetch('/api/admin/gmail-requests/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    setLoading(null)

    if (res.ok) {
      setApproved((prev) => new Set(prev).add(userId))
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setErrors((prev) => ({ ...prev, [userId]: data.error ?? 'Erro ao aprovar' }))
    }
  }

  const pending = requests.filter((r) => !approved.has(r.id))

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Solicitações Gmail{' '}
          <span className="text-sm font-normal text-gray-400">
            ({pending.length} pendente{pending.length !== 1 ? 's' : ''})
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-xs text-gray-500">
              ✓ {syncResult.users} usuário{syncResult.users !== 1 ? 's' : ''} · {syncResult.synced} nova{syncResult.synced !== 1 ? 's' : ''} mensagem{syncResult.synced !== 1 ? 's' : ''}{syncResult.errors > 0 ? ` · ${syncResult.errors} erro(s)` : ''}
            </span>
          )}
          {syncError && (
            <span className="text-xs text-red-500">{syncError}</span>
          )}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? 'Sincronizando...' : '↻ Sincronizar Gmail agora'}
          </button>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          Nenhuma solicitação pendente.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usuário</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email cadastro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Gmail solicitado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Solicitado em</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((req) => (
                <tr key={req.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{req.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{req.email}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{req.gmail_request_email}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {req.gmail_requested_at
                      ? new Date(req.gmail_requested_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleApprove(req.id)}
                        disabled={loading === req.id}
                        className="cursor-pointer rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading === req.id ? 'Aprovando...' : 'Aprovar'}
                      </button>
                      {errors[req.id] && (
                        <p className="text-xs text-red-500">{errors[req.id]}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
