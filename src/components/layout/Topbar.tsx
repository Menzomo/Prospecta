'use client'

import Link from 'next/link'

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
}

function getInitials(email: string | null | undefined): string {
  if (!email) return 'U'
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Topbar({ userEmail }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline bg-surface-container px-6 py-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-on-surface-muted">
          <IconSearch />
        </span>
        <input
          type="search"
          placeholder="Pesquisar leads, campanhas..."
          disabled
          className="w-full rounded-lg border border-outline bg-surface-low py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex items-center gap-1 ml-auto">
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
          className="flex items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low ml-2"
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
