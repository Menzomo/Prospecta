'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { suggestLeadNames } from '@/features/search/suggestActions'
import { createClient } from '@/lib/supabase/client'

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h2" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPhoneDisplay(phone: string): string {
  const match = phone.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/)
  if (!match) return phone
  return `(${match[1]}) ${match[2]}-${match[3]}`
}

function BalanceChip({ phoneNumber }: { phoneNumber?: string | null }) {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    async function fetch() {
      const { data } = await supabase.from('wallet_balances').select('balance').maybeSingle()
      setBalance(data ? Number(data.balance) : 0)
    }
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [])

  if (balance === null) return null

  const insufficient = balance < 0.20

  return (
    <Link
      href="/settings?section=carteira"
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        insufficient
          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-outline bg-surface-low text-on-surface hover:bg-surface-container'
      }`}
    >
      {phoneNumber && (
        <>
          <span className="flex items-center gap-1.5 font-medium">
            <IconPhone />
            Seu número: {formatPhoneDisplay(phoneNumber)}
          </span>
          <span className={`h-3 w-px ${insufficient ? 'bg-red-200' : 'bg-outline'}`} />
        </>
      )}
      <span className="flex items-center gap-1.5">
        <IconWallet />
        R$ {formatBRL(balance)}
      </span>
    </Link>
  )
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

interface TopbarProps {
  userEmail?: string | null
  phoneNumber?: string | null
}

function getInitials(email: string | null | undefined): string {
  if (!email) return 'U'
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Topbar({ userEmail, phoneNumber }: TopbarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await suggestLeadNames(val)
        setSuggestions(results)
        setOpen(results.length > 0)
      })
    }, 220)
  }

  const navigate = (name: string) => {
    setQuery(name)
    setOpen(false)
    router.push(`/leads?search=${encodeURIComponent(name)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(false)
    if (query.trim()) router.push(`/leads?search=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline bg-surface-container px-6 py-3">
      {/* Search with suggestions */}
      <div className="relative flex-1 max-w-sm">
        <form onSubmit={handleSubmit}>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-on-surface-muted">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
            placeholder="Pesquisar leads..."
            autoComplete="off"
            className="w-full rounded-lg border border-outline bg-surface-low py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </form>

        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-outline bg-surface-container shadow-hover">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => navigate(name)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-low"
              >
                <span className="shrink-0 text-on-surface-muted">
                  <IconSearch />
                </span>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <BalanceChip phoneNumber={phoneNumber} />

      <div className="ml-auto flex items-center gap-1">
        {/* Bell */}
        <button
          type="button"
          aria-label="Notificações"
          className="rounded-lg p-2 text-on-surface-muted transition-colors hover:bg-surface-low"
        >
          <IconBell />
        </button>

        {/* Add Leads CTA */}
        <Link
          href="/leads/new"
          className="ml-2 flex items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low"
        >
          <IconPlus />
          Adicionar Lead
        </Link>

        {/* User avatar */}
        <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {getInitials(userEmail)}
        </div>
      </div>
    </header>
  )
}
