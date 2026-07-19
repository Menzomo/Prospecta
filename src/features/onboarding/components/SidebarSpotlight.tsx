// Recria uma versão mini do sidebar real (mesmos ícones/cores), destacando um
// item e escurecendo o resto — mostra ao usuário onde o recurso fica no menu,
// sem precisar de screenshot (mais leve, nunca fica desatualizado com o design).

import {
  IconDashboard,
  IconLeads,
  IconSearch,
  IconTemplates,
  IconFollowups,
  IconSettings,
} from '@/components/layout/Sidebar'

export type SpotlightItem = 'dashboard' | 'leads' | 'search' | 'templates' | 'followups' | 'settings'

const ITEMS: { key: SpotlightItem; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard',       icon: <IconDashboard /> },
  { key: 'leads',     label: 'Leads',           icon: <IconLeads /> },
  { key: 'search',    label: 'Buscar Leads',    icon: <IconSearch /> },
  { key: 'templates', label: 'Templates',       icon: <IconTemplates /> },
  { key: 'followups', label: 'Acompanhamentos', icon: <IconFollowups /> },
  { key: 'settings',  label: 'Configurações',   icon: <IconSettings /> },
]

type Props = {
  highlight: SpotlightItem
  title: string
  description: string
  subItems?: { label: string; active?: boolean }[]
  children?: React.ReactNode
}

export function SidebarSpotlight({ highlight, title, description, subItems, children }: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline sm:flex-row">
      <div className="bg-sidebar px-2 py-3 sm:w-36 sm:shrink-0 sm:px-2 sm:py-4">
        <div className="flex flex-col gap-0.5">
          {ITEMS.map((item) => {
            const active = item.key === highlight
            return (
              <div key={item.key}>
                <div
                  className={`flex items-center gap-2 rounded-lg border-l-4 py-1.5 pl-1.5 pr-2 text-xs font-medium ${
                    active
                      ? 'border-blue-500 bg-blue-600/15 text-blue-400 opacity-100'
                      : 'border-transparent text-white/50 opacity-40 blur-[0.5px]'
                  }`}
                >
                  <span className={`shrink-0 ${active ? 'text-blue-400' : 'text-white/30'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
                {active && subItems && (
                  <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
                    {subItems.map((s) => (
                      <div
                        key={s.label}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${s.active ? 'font-semibold text-blue-400' : 'text-white/40'}`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 bg-surface-container p-3 sm:p-4">
        <p className="text-xs font-semibold text-on-surface sm:text-sm">{title}</p>
        <p className="mt-1 text-xs leading-snug text-on-surface-muted sm:text-sm sm:leading-relaxed">
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
