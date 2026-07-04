'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LeadCategory } from '@/types/globalLeads'

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

type Props = {
  categories: LeadCategory[]
  currentCategory: string
  currentCity: string
  currentSearch: string
}

export function LeadsFilterForm({ categories, currentCategory, currentCity, currentSearch }: Props) {
  const router = useRouter()

  function buildUrl(category: string, city: string) {
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    if (city) params.set('city', city)
    if (currentSearch) params.set('search', currentSearch)
    const qs = params.toString()
    return `/leads${qs ? `?${qs}` : ''}`
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildUrl(e.target.value, currentCity))
  }

  function handleCityBlur(e: React.FocusEvent<HTMLInputElement>) {
    const city = e.target.value.trim()
    if (city !== currentCity) {
      router.push(buildUrl(currentCategory, city))
    }
  }

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const city = (e.target as HTMLInputElement).value.trim()
      router.push(buildUrl(currentCategory, city))
    }
  }

  const hasActiveFilters = currentCategory !== 'all' || !!currentCity
  const clearHref = currentSearch ? `/leads?search=${encodeURIComponent(currentSearch)}` : '/leads'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentCategory}
        onChange={handleCategoryChange}
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
          key={currentCity}
          type="text"
          defaultValue={currentCity}
          placeholder="Filtrar por cidade..."
          onBlur={handleCityBlur}
          onKeyDown={handleCityKeyDown}
          className="rounded-lg border border-outline bg-surface-container py-2 pl-8 pr-3 text-sm text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {currentSearch && (
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          &ldquo;{currentSearch}&rdquo;
          <Link href="/leads" aria-label="Limpar busca" className="hover:text-primary-dark">✕</Link>
        </span>
      )}

      {hasActiveFilters && (
        <Link
          href={clearHref}
          className="text-sm text-on-surface-muted hover:text-on-surface hover:underline"
        >
          Limpar filtros
        </Link>
      )}
    </div>
  )
}
