'use client'

import Link from 'next/link'
import type { LeadCardData } from './LeadsGrid'
import type { LeadStatus } from '@/types/leads'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { CallButton } from '@/features/calls/components/CallButton'

type Column = {
  id: string
  label: string
  statuses: LeadStatus[]
  dot: string
}

const COLUMNS: Column[] = [
  {
    id: 'new',
    label: 'Novos',
    statuses: ['novo'],
    dot: 'bg-blue-500',
  },
  {
    id: 'contact',
    label: 'Em Contato',
    statuses: ['contatado', 'sem_resposta', 'responder_depois'],
    dot: 'bg-indigo-500',
  },
  {
    id: 'interested',
    label: 'Interessados',
    statuses: ['interessado', 'negociacao'],
    dot: 'bg-amber-500',
  },
  {
    id: 'no_interest',
    label: 'Sem Interesse',
    statuses: ['sem_interesse'],
    dot: 'bg-gray-400',
  },
  {
    id: 'converted',
    label: 'Convertidos',
    statuses: ['convertido', 'convertido_email', 'convertido_telefonia'],
    dot: 'bg-emerald-500',
  },
]

type Props = {
  leads: LeadCardData[]
  hasSettings: boolean
}

export function LeadsKanban({ leads, hasSettings }: Props) {
  const activeColumns = COLUMNS.map((col) => ({
    ...col,
    leads: leads.filter((l) => (col.statuses as string[]).includes(l.status)),
  })).filter((col) => col.leads.length > 0)

  if (activeColumns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-on-surface-muted">Nenhum lead encontrado.</p>
      </div>
    )
  }

  const colCount = activeColumns.length
  const gridCols =
    colCount === 1 ? 'grid-cols-1' :
    colCount === 2 ? 'grid-cols-2' :
    colCount === 3 ? 'grid-cols-3' :
    colCount === 4 ? 'grid-cols-2 lg:grid-cols-4' :
    'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {activeColumns.map((col) => (
        <div key={col.id} className="flex flex-col gap-3">
          {/* Column header */}
          <div className="flex items-center gap-2 rounded-lg border border-outline bg-surface-container px-4 py-3">
            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${col.dot}`} />
            <span className="text-sm font-semibold text-on-surface">{col.label}</span>
            <span className="ml-auto rounded-full bg-surface-low px-2.5 py-0.5 text-xs font-semibold text-on-surface-muted">
              {col.leads.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {col.leads.map((lead) => (
              <div
                key={lead.key}
                className="flex flex-col rounded-xl border border-outline bg-surface-container p-4 shadow-card transition-shadow hover:shadow-hover"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={lead.company_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-on-surface">
                      {lead.company_name}
                    </p>
                    {(lead.category_name || lead.city) && (
                      <p className="mt-0.5 truncate text-sm text-on-surface-muted">
                        {[lead.category_name, lead.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <StatusBadge status={lead.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Link
                    href={lead.sendHref}
                    className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    Email
                  </Link>
                  {lead.phone && (
                    <CallButton
                      phone={lead.phone}
                      hasSettings={hasSettings}
                      companyName={lead.company_name}
                      leadId={lead.leadId}
                      userLeadId={lead.userLeadId}
                      size="sm"
                    />
                  )}
                  <Link
                    href={lead.leadHref}
                    className="rounded-md border border-outline px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-low"
                  >
                    Detalhes
                  </Link>
                  <form action={lead.hideAction}>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-on-surface-muted transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      Ocultar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
