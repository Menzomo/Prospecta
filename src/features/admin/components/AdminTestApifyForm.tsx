'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function AdminTestApifyForm() {
  const [categoria, setCategoria] = useState('Metalúrgica')
  const [cidade, setCidade] = useState('Caxias do Sul, RS')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<unknown>(null)

  async function handleTest() {
    setStatus('loading')
    setResult(null)

    try {
      const res = await fetch('/api/admin/test-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, cidade }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult(data)
        setStatus('error')
        return
      }

      setResult(data)
      setStatus('success')
    } catch {
      setResult({ error: 'Falha na requisição' })
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Parâmetros do teste</h2>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Categoria</label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Metalúrgica"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Cidade</label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Caxias do Sul, RS"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTest}
              disabled={status === 'loading' || !categoria.trim() || !cidade.trim()}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'loading' ? 'Consultando Apify...' : 'Testar Apify'}
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <p className="mt-3 text-xs text-gray-500">
            Aguardando resposta do Apify — pode levar até 90 segundos...
          </p>
        )}
      </div>

      {result !== null && (
        <div className={`rounded-lg border p-6 ${status === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="mb-3 flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
              {status === 'error' ? 'Erro' : 'Resultado'}
            </span>
          </div>
          <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-xs text-green-400">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
