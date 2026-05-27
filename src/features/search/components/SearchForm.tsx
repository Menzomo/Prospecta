'use client'

import { useState, useRef } from 'react'
import { SearchResults } from './SearchResults'
import type { SearchApiResponse } from '../types'

type Category = { id: string; name: string }
type CityResult = { name: string; state_code: string }

interface SearchFormProps {
  categories: Category[]
}

export function SearchForm({ categories }: SearchFormProps) {
  const [category, setCategory] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [suggestions, setSuggestions] = useState<CityResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<SearchApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCityInput(value: string) {
    setCityInput(value)
    setSelectedCity('')
    setSelectedState('')
    setSuggestions([])

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.cities ?? [])
          setShowSuggestions(true)
        }
      } catch {
        // silent fail — autocomplete is best-effort
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  function selectCity(city: CityResult) {
    setCityInput(`${city.name}, ${city.state_code}`)
    setSelectedCity(city.name)
    setSelectedState(city.state_code)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!category || !selectedCity) return

    setLoading(true)
    setError(null)
    setResponse(null)

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

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro na busca. Tente novamente.')
        return
      }

      setResponse(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && !!category && !!selectedCity

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
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
          <div className="relative">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => handleCityInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Digite para buscar a cidade..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searching && (
              <span className="absolute right-3 top-2 text-xs text-gray-400">
                Buscando...
              </span>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-md">
                {suggestions.map((city) => (
                  <li
                    key={`${city.name}-${city.state_code}`}
                    onMouseDown={() => selectCity(city)}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {city.name}, {city.state_code}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {cityInput.length >= 2 && !selectedCity && !searching && suggestions.length === 0 && (
            <p className="text-xs text-gray-400">Nenhuma cidade encontrada. Tente outro termo.</p>
          )}
          {cityInput.length >= 2 && !selectedCity && !searching && suggestions.length > 0 && (
            <p className="text-xs text-gray-400">Selecione uma cidade da lista</p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Buscando leads...' : 'Buscar leads'}
        </button>
      </form>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-500">Buscando leads disponíveis...</p>
        </div>
      )}

      {!loading && response && <SearchResults response={response} />}
    </div>
  )
}
