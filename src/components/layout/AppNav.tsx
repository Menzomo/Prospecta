'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex items-center overflow-x-auto px-4">
        <Link
          href="/dashboard"
          className="mr-5 shrink-0 text-sm font-bold text-blue-600"
        >
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
  )
}
