'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type NavItem = {
  href: string
  label: string
  match: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', match: (p) => p.startsWith('/dashboard') },
  { href: '/leads', label: 'Leads', match: (p) => p.startsWith('/leads') },
  { href: '/search', label: 'Buscar leads', match: (p) => p.startsWith('/search') },
  { href: '/templates', label: 'Templates', match: (p) => p.startsWith('/templates') },
  { href: '/followups', label: 'Acompanhamentos', match: (p) => p.startsWith('/followups') },
  {
    href: '/settings',
    label: 'Configurações',
    match: (p) => p === '/settings' || p.startsWith('/settings/'),
  },
]

const ADMIN_ITEM: NavItem = {
  href: '/admin',
  label: 'Admin',
  match: (p) => p.startsWith('/admin'),
}

interface AppNavProps {
  isAdmin?: boolean
}

export function AppNav({ isAdmin = false }: AppNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* ── Desktop nav — hidden on mobile ── */}
      <nav className="hidden border-b border-gray-200 bg-white sm:block">
        <div className="flex items-center overflow-x-auto px-4">
          <Link href="/dashboard" className="mr-5 shrink-0 text-sm font-bold text-blue-600">
            Prospecta
          </Link>

          {items.map((item) => {
            const isActive = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Mobile header — hidden on sm+ ── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:hidden">
        <Link href="/dashboard" className="text-sm font-bold text-blue-600">
          Prospecta
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out sm:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu de navegação"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="text-sm font-bold text-blue-600"
          >
            Prospecta
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer nav items */}
        <nav className="overflow-y-auto py-2">
          {items.map((item) => {
            const isActive = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex cursor-pointer items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
