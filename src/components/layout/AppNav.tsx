'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  activePrefix: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', activePrefix: '/dashboard' },
  { href: '/leads', label: 'Leads', activePrefix: '/leads' },
  { href: '/search', label: 'Buscar leads', activePrefix: '/search' },
  { href: '/inbox', label: 'Inbox', activePrefix: '/inbox' },
  { href: '/followups', label: 'Followups', activePrefix: '/followups' },
  { href: '/settings/company', label: 'Configurações', activePrefix: '/settings' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex items-center overflow-x-auto px-4">
        <Link
          href="/dashboard"
          className="mr-5 shrink-0 text-sm font-bold text-blue-600"
        >
          Prospecta
        </Link>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.activePrefix ||
            pathname.startsWith(item.activePrefix + '/')

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
