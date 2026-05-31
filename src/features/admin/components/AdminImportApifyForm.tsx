'use client'

import { useState } from 'react'
import { CityAutocomplete } from '@/components/CityAutocomplete'

type Category = { id: string; name: string }

type ImportSummary = {
  imported: number
  skipped_duplicate: number
  invalid: number
  email_found: number
  website_only: number
  manual_review: number
}

type Status = 'idle' | 'confirming' | 'loading' | 'done' | 'error'

interface Props {
  categories: Category[]
  initialCategoryId?: string
}

export function AdminImportApifyForm({ categories, initialCategoryId = '' }: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(200)
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCategory = categories.find((c) => c.id === categoryId)

  function handleClickImport() {
    if (!categoryId || !city) return
    setStatus('confirming')
  }

  function handleCancel() {
    setStatus('idle')
  }

  async function handleConfirm() {
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

  const canProceed = !!categoryId && !!city && status === 'idle'

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Configurar importação</h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Nicho</label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setStatus('idle') }}
              disabled={status === 'loading' || status === 'confirming'}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Selecionar nicho...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Cidade</label>
            <CityAutocomplete
              onSelect={(_name, _stateCode, display) => {
                setCity(display)
                setStatus('idle')
              }}
              onClear={() => {
                setCity('')
                setStatus('idle')
              }}
              placeholder="Digite para buscar..."
              disabled={status === 'loading' || status === 'confirming'}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Quantidade (máx. 200)</label>
            <input
              type="number"
              min={5}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Math.min(200, Math.max(5, Number(e.target.value))))}
              disabled={status === 'loading' || status === 'confirming'}
              className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {status !== 'confirming' && status !== 'loading' && (
            <button
              onClick={handleClickImport}
              disabled={!canProceed}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Importar Leads
            </button>
          )}
        </div>

        {status === 'confirming' && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">
              Confirmar importação via Apify
            </p>
            <p className="mt-1 text-sm text-yellow-700">
              Esta ação irá buscar até <strong>{limit} leads</strong> de{' '}
              <strong>{selectedCategory?.name}</strong> em{' '}
              <strong>{city}</strong> e pode consumir créditos da Apify.
              Verifique o saldo antes de confirmar.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleConfirm}
                className="rounded-md bg-yellow-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
              >
                Confirmar Importação
              </button>
              <button
                onClick={handleCancel}
                className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <p className="mt-3 text-xs text-gray-500">
            Consultando Apify e inserindo leads — pode levar até 90 segundos para quantidades grandes...
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
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 text-xs text-gray-500 underline hover:text-gray-700"
          >
            Nova importação
          </button>
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
