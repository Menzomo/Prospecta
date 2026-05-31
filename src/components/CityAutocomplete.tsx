'use client'

import { useState, useRef } from 'react'

type CityResult = { name: string; state_code: string }

interface Props {
  value: string
  onSelect: (cityName: string, stateCode: string, displayValue: string) => void
  onClear: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CityAutocomplete({ value, onSelect, onClear, placeholder = 'Digite para buscar a cidade...', disabled, className }: Props) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(raw: string) {
    onClear()
    setSuggestions([])

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (raw.length < 2) {
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(raw)}`)
        if (res.ok) {
          const data = await res.json() as { cities?: CityResult[] }
          setSuggestions(data.cities ?? [])
          setShowSuggestions(true)
        }
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  function handleSelect(city: CityResult) {
    setSuggestions([])
    setShowSuggestions(false)
    onSelect(city.name, city.state_code, `${city.name}, ${city.state_code}`)
  }

  const baseInput = `rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${className ?? 'w-full'}`

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={baseInput}
      />
      {searching && (
        <span className="absolute right-3 top-2 text-xs text-gray-400">Buscando...</span>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-md">
          {suggestions.map((city) => (
            <li
              key={`${city.name}-${city.state_code}`}
              onMouseDown={() => handleSelect(city)}
              className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
            >
              {city.name}, {city.state_code}
            </li>
          ))}
        </ul>
      )}
      {value.length >= 2 && !searching && suggestions.length === 0 && (
        <p className="mt-1 text-xs text-gray-400">Nenhuma cidade encontrada.</p>
      )}
    </div>
  )
}
