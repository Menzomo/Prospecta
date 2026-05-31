'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CityAutocomplete } from '@/components/CityAutocomplete'

type Category = { id: string; name: string }

type JobStarted = {
  job_id: string
  apify_run_id: string
  status: string
}

type ApifyErrorDetail = {
  error?: string
  apify_status?: number
  apify_body?: string
  payload_sent?: Record<string, unknown>
  hint?: string
}

type Status = 'idle' | 'confirming' | 'loading' | 'started' | 'error'

interface Props {
  categories: Category[]
  initialCategoryId?: string
}

export function AdminImportApifyForm({ categories, initialCategoryId = '' }: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(200)
  const [status, setStatus] = useState<Status>('idle')
  const [jobStarted, setJobStarted] = useState<JobStarted | null>(null)
  const [errorDetail, setErrorDetail] = useState<ApifyErrorDetail | null>(null)
  const router = useRouter()
  const [, startTransition] = useTransition()

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
    setErrorDetail(null)
    setJobStarted(null)

    try {
      const res = await fetch('/api/admin/import-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, city, limit }),
      })

      const data = await res.json() as JobStarted & ApifyErrorDetail

      if (!res.ok) {
        setErrorDetail(data)
        setStatus('error')
        return
      }

      setJobStarted(data)
      setStatus('started')
      startTransition(() => router.refresh())
    } catch {
      setErrorDetail({ error: 'Falha na requisição' })
      setStatus('error')
    }
  }

  const canProceed = !!categoryId && !!city && status === 'idle'

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Configurar importação</h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end flex-wrap">
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

          <div className="flex flex-col gap-1 min-w-[200px]">
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
            <label className="text-xs font-medium text-gray-600">Quantidade <span className="text-gray-400">(máx. 200)</span></label>
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

        <p className="mt-3 text-xs text-gray-400">
          O run é iniciado na Apify de forma assíncrona. Use o botão "Atualizar status" na lista abaixo para processar o resultado.
        </p>

        {status === 'confirming' && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">Confirmar importação via Apify</p>
            <p className="mt-1 text-sm text-yellow-700">
              Esta ação irá buscar até <strong>{limit} leads</strong> de{' '}
              <strong>{selectedCategory?.name}</strong> em <strong>{city}</strong> e pode consumir créditos da Apify.
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
          <p className="mt-3 text-xs text-gray-500">Iniciando run na Apify...</p>
        )}
      </div>

      {status === 'started' && jobStarted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Run iniciado com sucesso!</p>
          <p className="mt-1 text-xs text-blue-700">
            Job ID: <code className="font-mono">{jobStarted.job_id}</code>
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            Apify Run ID: <code className="font-mono">{jobStarted.apify_run_id}</code>
          </p>
          <p className="mt-2 text-xs text-blue-600">
            Aguarde o run concluir na Apify e clique em "Atualizar status" na lista abaixo para importar os leads.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-3 text-xs text-blue-600 underline hover:text-blue-800"
          >
            Nova importação
          </button>
        </div>
      )}

      {status === 'error' && errorDetail && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-red-800">{errorDetail.error ?? 'Erro ao importar'}</p>
          {errorDetail.hint && <p className="text-xs text-red-700">{errorDetail.hint}</p>}
          {errorDetail.apify_status && (
            <p className="text-xs text-red-600">Status Apify: {errorDetail.apify_status}</p>
          )}
          {errorDetail.apify_body && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 hover:underline">Ver resposta da Apify</summary>
              <pre className="mt-1 overflow-x-auto rounded bg-red-100 p-2 text-red-800">{errorDetail.apify_body}</pre>
            </details>
          )}
          {errorDetail.payload_sent && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 hover:underline">Ver payload enviado</summary>
              <pre className="mt-1 overflow-x-auto rounded bg-red-100 p-2 text-red-800">
                {JSON.stringify(errorDetail.payload_sent, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
