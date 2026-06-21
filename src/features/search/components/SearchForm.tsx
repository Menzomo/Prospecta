'use client'

import { useState } from 'react'
import { SearchResults } from './SearchResults'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import type { LeadPreviewItem, SearchPreviewResponse, ConfirmLeadsResponse } from '../types'
import type { AvailableCity } from '@/repositories/globalLeadRepository'

type Category = { id: string; name: string }

interface SearchFormProps {
  categories: Category[]
  onConfirmed?: (added: number) => void
  /** When set, city is pre-filled and locked (onboarding use-case) */
  lockedCity?: { name: string; state: string }
  /** When set, cap and relabel the remaining-credits display */
  betaLimit?: number
  /** Cities with available leads for the user. When provided and not admin, replaces free-text input. */
  availableCities?: AvailableCity[]
  /** When true, keep full autocomplete for city */
  isAdmin?: boolean
}

export function SearchForm({ categories, onConfirmed, lockedCity, betaLimit, availableCities, isAdmin }: SearchFormProps) {
  const [category, setCategory] = useState('')
  const [selectedCity, setSelectedCity] = useState(lockedCity?.name ?? '')
  const [selectedState, setSelectedState] = useState(lockedCity?.state ?? '')

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
      if (data.added > 0) onConfirmed?.(data.added)
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
        className="flex flex-col gap-4 rounded-xl border border-outline bg-surface-container p-6 shadow-card"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
          <label className="text-sm font-medium text-on-surface">
            Cidade <span className="text-red-500">*</span>
          </label>
          {lockedCity ? (
            <>
              <input
                type="text"
                value={lockedCity.name}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-outline bg-surface-low px-3 py-2 text-sm text-on-surface-muted [-webkit-text-fill-color:#424654]"
              />
              <p className="text-xs text-on-surface-muted">
                Nesta versão beta, começamos com leads disponíveis em Caxias do Sul.
              </p>
            </>
          ) : availableCities && !isAdmin ? (
            <select
              value={selectedCity}
              onChange={(e) => {
                const chosen = availableCities.find((c) => c.city === e.target.value)
                setSelectedCity(chosen?.city ?? '')
                const rawState = chosen?.state ?? ''
                setSelectedState(rawState.length === 2 ? rawState : '')
              }}
              className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Selecione uma cidade</option>
              {availableCities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}{c.state ? `, ${c.state}` : ''}
                </option>
              ))}
            </select>
          ) : (
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
              inputClassName="w-full rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface [-webkit-text-fill-color:#191b23] placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSearch}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed"
        >
          {loading ? 'Buscando...' : 'Buscar leads'}
        </button>
      </form>

      {/* Loading spinner */}
      {loading && (
        <div className="rounded-xl border border-outline bg-surface-container p-8 shadow-card text-center">
          <p className="text-sm text-on-surface-muted">Buscando leads disponíveis...</p>
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
              {betaLimit
                ? `Leads restantes no beta: ${Math.min(confirmResult.monthly_remaining, betaLimit)}`
                : `Créditos restantes este mês: ${confirmResult.monthly_remaining}`}
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
        <div className="rounded-xl border border-outline bg-surface-container p-8 shadow-card text-center">
          <p className="text-sm text-on-surface-muted">{searchMessage}</p>
        </div>
      )}

      {/* Preview + selection phase */}
      {!loading && leads.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Stats + selection controls */}
          <div className="flex items-center justify-between rounded-xl border border-outline bg-surface-container px-5 py-4 shadow-card">
            <div className="flex gap-6">
              <div>
                <p className="text-xl font-bold text-on-surface">{leads.length}</p>
                <p className="text-xs text-on-surface-muted">disponíveis</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{selectedIds.size}</p>
                <p className="text-xs text-on-surface-muted">selecionados</p>
              </div>
              {isUnlimited ? (
                <div>
                  <p className="text-xl font-bold text-purple-600">∞</p>
                  <p className="text-xs text-on-surface-muted">sem limite</p>
                </div>
              ) : betaLimit ? (
                <div>
                  <p className="text-xl font-bold text-on-surface">
                    {Math.min(monthlyRemaining, betaLimit)}
                  </p>
                  <p className="text-xs text-on-surface-muted">leads no beta</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-bold text-on-surface">{monthlyRemaining}</p>
                  <p className="text-xs text-on-surface-muted">créditos/mês</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="cursor-pointer text-primary hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-outline">|</span>
              <button
                type="button"
                onClick={clearSelection}
                className="cursor-pointer text-on-surface-muted hover:underline"
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
            <p className="text-center text-xs text-on-surface-muted">
              Leads não selecionados continuarão disponíveis para buscas futuras.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
