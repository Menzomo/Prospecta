'use client'

import { useState } from 'react'
import { LeadsGrid } from './LeadsGrid'
import type { LeadCardData } from './LeadsGrid'

type Props = {
  newLeads: LeadCardData[]
  contactedLeads: LeadCardData[]
  hasSettings: boolean
}

export function LeadsTabs({ newLeads, contactedLeads, hasSettings }: Props) {
  const [tab, setTab] = useState<'new' | 'contacted'>('new')

  const tabs = [
    { id: 'new' as const, label: 'Novos', count: newLeads.length },
    { id: 'contacted' as const, label: 'Contatados', count: contactedLeads.length },
  ]

  const visible = tab === 'new' ? newLeads : contactedLeads

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-outline bg-surface-container p-1 self-start">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-muted hover:bg-surface-low hover:text-on-surface'
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                tab === t.id
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-low text-on-surface-muted'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-outline bg-surface-container p-8 text-center shadow-card">
          <p className="text-sm text-on-surface-muted">
            {tab === 'new'
              ? 'Nenhum lead novo encontrado.'
              : 'Nenhum lead contatado encontrado.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-on-surface-muted">
            {visible.length} {visible.length === 1 ? 'lead' : 'leads'}
          </p>
          <LeadsGrid leads={visible} hasSettings={hasSettings} />
        </>
      )}
    </div>
  )
}
