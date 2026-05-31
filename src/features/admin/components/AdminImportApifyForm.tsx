'use client'

import { useState } from 'react'

type Category = { id: string; name: string }

type ImportSummary = {
  imported: number
  skipped_duplicate: number
  invalid: number
  email_found: number
  website_only: number
  manual_review: number
}

type Status = 'idle' | 'loading' | 'done' | 'error'

interface Props {
  categories: Category[]
}

export function AdminImportApifyForm({ categories }: Props) {
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(10)
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!categoryId || !city.trim()) return
    setStatus('loading')
    setError(null)
    setSummary(null)

    try {
      const res = await fetch('/api/admin/import-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, city: city.trim(), limit }),
      })

      const data = await res.json() as { summary?: ImportSummary; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erro ao importar')
        setStatus('error')
        return
      }

      setSummary(data.summary ?? null)
      setStatus('done')
    } catch {
      setError('Falha na requisição')
      setStatus('error')
    }
  }

  const canImport = !!categoryId && !!city.trim() && status !== 'loading'

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Configurar importação</h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Nicho</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecionar nicho...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Caxias do Sul, RS"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Quantidade (máx. 30)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={limit}
              onChange={(e) => setLimit(Math.min(30, Math.max(5, Number(e.target.value))))}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!canImport}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'loading' ? 'Importando...' : 'Importar Leads'}
          </button>
        </div>

        {status === 'loading' && (
          <p className="mt-3 text-xs text-gray-500">
            Consultando Apify e inserindo leads — pode levar até 90 segundos...
          </p>
        )}
      </div>

      {status === 'error' && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === 'done' && summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-green-800">Importação concluída</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Importados" value={summary.imported} color="green" />
            <Stat label="Duplicatas ignoradas" value={summary.skipped_duplicate} color="gray" />
            <Stat label="Inválidos" value={summary.invalid} color="red" />
            <Stat label="Email Found" value={summary.email_found} color="blue" />
            <Stat label="Website Only" value={summary.website_only} color="yellow" />
            <Stat label="Manual Review" value={summary.manual_review} color="orange" />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-700 bg-green-100',
    gray: 'text-gray-600 bg-gray-100',
    red: 'text-red-700 bg-red-100',
    blue: 'text-blue-700 bg-blue-100',
    yellow: 'text-yellow-700 bg-yellow-100',
    orange: 'text-orange-700 bg-orange-100',
  }
  return (
    <div className={`rounded-md px-3 py-2 ${colors[color]}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}
