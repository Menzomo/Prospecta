'use client'

import { useState } from 'react'
import { SearchResults } from './SearchResults'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import type { LeadPreviewItem, SearchPreviewResponse, ConfirmLeadsResponse } from '../types'

type Category = { id: string; name: string }

interface SearchFormProps {
  categories: Category[]
}

export function SearchForm({ categories }: SearchFormProps) {
  const [category, setCategory] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedState, setSelectedState] = useState('')

  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [leads, setLeads] = useState<LeadPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [monthlyRemaining, setMonthlyRemaining] = useState<number>(0)
  const [confirmResult, setConfirmResult] = useState<ConfirmLeadsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)

  function toggleLead(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(leads.map((l) => l.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!category || !selectedCity) return

    setLoading(true)
    setError(null)
    setSearchMessage(null)
    setLeads([])
    setSelectedIds(new Set())
    setConfirmResult(null)

    try {
      const res = await fetch('/api/search/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          city: selectedCity,
          state: selectedState || undefined,
        }),
      })

      const data: SearchPreviewResponse & { error?: string } = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro na busca. Tente novamente.')
        return
      }

      setLeads(data.leads)
      setMonthlyRemaining(data.monthly_remaining)
      if (data.message) setSearchMessage(data.message)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (selectedIds.size === 0) return

    setConfirming(true)
    setError(null)

    try {
      const res = await fetch('/api/user-leads/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_lead_ids: [...selectedIds] }),
      })

      const data: ConfirmLeadsResponse & { error?: string } = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao adicionar leads. Tente novamente.')
        return
      }

      setConfirmResult(data)
      setLeads([])
      setSelectedIds(new Set())
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  const canSearch = !loading && !confirming && !!category && !!selectedCity
  const canConfirm = !confirming && selectedIds.size > 0
  const isUnlimited = monthlyRemaining === -1

  return (
    <div className="flex flex-col gap-6">
      {/* Search form — always visible */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Cidade <span className="text-red-500">*</span>
          </label>
          <CityAutocomplete
            onSelect={(name, stateCode) => {
              setSelectedCity(name)
              setSelectedState(stateCode)
            }}
            onClear={() => {
              setSelectedCity('')
              setSelectedState('')
            }}
            placeholder="Digite para buscar a cidade..."
            inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSearch}
          className="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Buscando...' : 'Buscar leads'}
        </button>
      </form>

      {/* Loading spinner */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-500">Buscando leads disponíveis...</p>
        </div>
      )}

      {/* Confirmation success */}
      {!loading && confirmResult !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-green-800">
            {confirmResult.added > 0
              ? `${confirmResult.added} ${confirmResult.added === 1 ? 'lead adicionado' : 'leads adicionados'} à aba Leads!`
              : confirmResult.already_owned > 0
                ? `${confirmResult.already_owned} ${confirmResult.already_owned === 1 ? 'lead selecionado já estava' : 'leads selecionados já estavam'} em Leads.`
                : 'Nenhum lead foi adicionado.'}
          </p>
          {confirmResult.already_owned > 0 && (
            <p className="mt-0.5 text-xs text-green-700">
              {confirmResult.already_owned} {confirmResult.already_owned === 1 ? 'lead já estava' : 'leads já estavam'} em Leads e {confirmResult.already_owned === 1 ? 'foi ignorado' : 'foram ignorados'}.
            </p>
          )}
          {confirmResult.skipped_invalid > 0 && (
            <p className="mt-0.5 text-xs text-yellow-700">
              {confirmResult.skipped_invalid} {confirmResult.skipped_invalid === 1 ? 'lead não pôde ser adicionado' : 'leads não puderam ser adicionados'} por dados incompletos.
            </p>
          )}
          {confirmResult.monthly_remaining >= 0 && (
            <p className="mt-1 text-xs text-green-700">
              Créditos restantes este mês: {confirmResult.monthly_remaining}
            </p>
          )}
          <button
            type="button"
            onClick={() => setConfirmResult(null)}
            className="mt-3 cursor-pointer text-xs font-medium text-green-700 underline hover:text-green-900"
          >
            Fazer nova busca
          </button>
        </div>
      )}

      {/* Empty search result */}
      {!loading && leads.length === 0 && searchMessage && confirmResult === null && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-500">{searchMessage}</p>
        </div>
      )}

      {/* Preview + selection phase */}
      {!loading && leads.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Stats + selection controls */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex gap-6">
              <div>
                <p className="text-xl font-bold text-gray-900">{leads.length}</p>
                <p className="text-xs text-gray-500">disponíveis</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{selectedIds.size}</p>
                <p className="text-xs text-gray-500">selecionados</p>
              </div>
              {isUnlimited ? (
                <div>
                  <p className="text-xl font-bold text-purple-600">∞</p>
                  <p className="text-xs text-gray-500">sem limite</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-bold text-gray-900">{monthlyRemaining}</p>
                  <p className="text-xs text-gray-500">créditos/mês</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="cursor-pointer text-blue-600 hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearSelection}
                className="cursor-pointer text-gray-400 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Lead cards */}
          <SearchResults
            leads={leads}
            selectedIds={selectedIds}
            onToggle={toggleLead}
            disabled={confirming}
          />

          {/* Confirm action */}
          <div className="flex flex-col gap-2">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full cursor-pointer rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirming
                ? 'Adicionando...'
                : selectedIds.size === 0
                  ? 'Selecione ao menos 1 lead para adicionar'
                  : `Adicionar ${selectedIds.size} ${selectedIds.size === 1 ? 'lead' : 'leads'} em Leads`}
            </button>
            <p className="text-center text-xs text-gray-400">
              Leads não selecionados continuarão disponíveis para buscas futuras.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
