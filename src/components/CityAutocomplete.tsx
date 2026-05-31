'use client'

import { useState, useRef } from 'react'

type CityResult = { name: string; state_code: string }

interface Props {
  onSelect: (cityName: string, stateCode: string, displayValue: string) => void
  onClear: () => void
  placeholder?: string
  disabled?: boolean
  inputClassName?: string
}

export function CityAutocomplete({ onSelect, onClear, placeholder = 'Digite para buscar a cidade...', disabled, inputClassName }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [isSelected, setIsSelected] = useState(false)
  const [suggestions, setSuggestions] = useState<CityResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(raw: string) {
    setInputValue(raw)
    setIsSelected(false)
    setSuggestions([])
    onClear()

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
    const display = `${city.name}, ${city.state_code}`
    setInputValue(display)
    setIsSelected(true)
    setSuggestions([])
    setShowSuggestions(false)
    onSelect(city.name, city.state_code, display)
  }

  const base = inputClassName ?? 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50'

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={base}
      />
      {searching && (
        <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
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
      {inputValue.length >= 2 && !isSelected && !searching && (
        <p className="mt-1 text-xs text-gray-400">
          {suggestions.length > 0 ? 'Selecione uma cidade da lista' : 'Nenhuma cidade encontrada.'}
        </p>
      )}
    </div>
  )
}
