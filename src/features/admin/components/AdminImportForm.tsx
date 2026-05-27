'use client'

import { useRef, useState } from 'react'
import {
  parseImportFile,
  type ImportRow,
  type ImportSummary,
} from '@/features/admin/utils/parseImportFile'

type FormStatus = 'idle' | 'preview' | 'importing' | 'done'

type Category = { id: string; name: string }

interface Props {
  categories: Category[]
}

const PREVIEW_LIMIT = 20

export function AdminImportForm({ categories }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text !== 'string') return

      const parsed = parseImportFile(text, file.name)
      if (parsed.length === 0) {
        setError('Nenhum lead encontrado no arquivo. Verifique o formato JSON ou CSV.')
        return
      }
      setRows(parsed)
      setStatus('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    setStatus('importing')
    setError(null)

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: selectedCategoryId, rows }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`)
      }

      const data = (await res.json()) as { summary: ImportSummary }
      setSummary(data.summary)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar')
      setStatus('preview')
    }
  }

  function handleReset() {
    setStatus('idle')
    setSelectedCategoryId('')
    setRows([])
    setSummary(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const canImport = !!selectedCategoryId && rows.length > 0 && status !== 'importing'

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1 — Category select */}
      {status !== 'done' && (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-5">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Categoria da importação <span className="text-red-500">*</span>
          </label>
          <p className="mb-3 text-xs text-gray-400">
            Todos os leads deste arquivo serão vinculados a esta categoria.
          </p>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            disabled={status === 'importing'}
            className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Selecione uma categoria...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 2 — File picker */}
      {status !== 'done' && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Selecione um arquivo exportado do Apify
          </p>
          <p className="mb-4 text-xs text-gray-400">Formatos aceitos: .json, .csv</p>
          <label className="cursor-pointer inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Escolher arquivo
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={status === 'importing'}
            />
          </label>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Preview */}
      {(status === 'preview' || status === 'importing') && rows.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Preview{' '}
                <span className="text-sm font-normal text-gray-400">
                  ({rows.length} lead{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''})
                </span>
              </h2>
              {selectedCategory && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Categoria: <span className="font-medium text-gray-700">{selectedCategory.name}</span>
                </p>
              )}
              {!selectedCategory && (
                <p className="mt-0.5 text-xs text-red-500">Selecione uma categoria para importar</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={status === 'importing'}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'importing'
                  ? 'Importando...'
                  : `Importar ${rows.length} lead${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.state ?? '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-600">
                      {row.website ? (
                        <span title={row.website}>{row.website}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > PREVIEW_LIMIT && (
              <p className="px-4 py-3 text-xs text-gray-400">
                Exibindo {PREVIEW_LIMIT} de {rows.length} leads. Todos serão importados.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Summary */}
      {status === 'done' && summary && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Resultado da Importação</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SummaryCard label="Importados" value={summary.imported} color="text-green-700 bg-green-50" />
            <SummaryCard label="Ignorados (duplicata)" value={summary.skipped_duplicate} color="text-gray-700 bg-gray-50" />
            <SummaryCard label="Inválidos" value={summary.invalid} color="text-red-700 bg-red-50" />
            <SummaryCard label="Email Found" value={summary.email_found} color="text-green-700 bg-green-50" />
            <SummaryCard label="Website Only" value={summary.website_only} color="text-blue-700 bg-blue-50" />
            <SummaryCard label="Manual Review" value={summary.manual_review} color="text-yellow-700 bg-yellow-50" />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="mt-6 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importar outro arquivo
          </button>
        </section>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const [textColor, bgColor] = color.split(' ')
  return (
    <div className={`rounded-lg border border-gray-200 px-4 py-4 ${bgColor}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  )
}
