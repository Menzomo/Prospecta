'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { LeadCategory } from '@/types/globalLeads'
import type { LeadCardData } from './LeadsGrid'
import { LeadsKanban } from './LeadsKanban'

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

type Props = {
  leads: LeadCardData[]
  categories: LeadCategory[]
  hasSettings: boolean
}

export function LeadsView({ leads, categories, hasSettings }: Props) {
  const [category, setCategory] = useState('all')
  const [city, setCity] = useState('')

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (category !== 'all') {
        const cat = categories.find((c) => c.slug === category)
        if (cat && l.category_name !== cat.name) return false
      }
      if (city && !l.city?.toLowerCase().includes(city.toLowerCase())) return false
      return true
    })
  }, [leads, category, city, categories])

  const hasActiveFilters = category !== 'all' || !!city

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="cursor-pointer rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Todos os nichos</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>

        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-on-surface-muted">
            <IconSearch />
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filtrar por cidade..."
            className="rounded-lg border border-outline bg-surface-container py-2 pl-8 pr-3 text-sm text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setCategory('all'); setCity('') }}
            className="text-sm text-on-surface-muted hover:text-on-surface hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-on-surface-muted">
            {hasActiveFilters
              ? 'Nenhum lead encontrado para os filtros selecionados.'
              : 'Nenhum lead cadastrado ainda.'}
          </p>
          {!hasActiveFilters && (
            <Link href="/leads/new" className="mt-3 text-sm text-primary hover:underline">
              Adicionar seu primeiro lead
            </Link>
          )}
        </div>
      ) : (
        <LeadsKanban leads={filtered} hasSettings={hasSettings} />
      )}
    </div>
  )
}
