'use client'

import Link from 'next/link'
import type { LeadCardData } from './LeadsGrid'
import type { LeadStatus } from '@/types/leads'
import { LEAD_STATUS_LABELS } from '@/types/leads'
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
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 288 + (COLUMNS.length - 1) * 12}px` }}>
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => (col.statuses as string[]).includes(l.status))
          return (
            <div key={col.id} className="flex w-72 shrink-0 flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2.5 border border-outline">
                <div className={`h-2 w-2 shrink-0 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-on-surface">{col.label}</span>
                <span className="ml-auto rounded-full bg-surface-low px-2 py-0.5 text-xs font-medium text-on-surface-muted">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                {colLeads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline px-4 py-8 text-center">
                    <p className="text-xs text-on-surface-muted">Nenhum lead</p>
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.key}
                      className="flex flex-col rounded-xl border border-outline bg-surface-container p-4 shadow-card transition-shadow hover:shadow-hover"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Avatar name={lead.company_name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-snug text-on-surface">
                            {lead.company_name}
                          </p>
                          {(lead.category_name || lead.city) && (
                            <p className="mt-0.5 truncate text-xs text-on-surface-muted">
                              {[lead.category_name, lead.city].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <StatusBadge status={lead.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Link
                          href={lead.sendHref}
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
                          className="rounded-md border border-outline px-2.5 py-1 text-xs font-medium text-on-surface transition-colors hover:bg-surface-low"
                        >
                          Detalhes
                        </Link>
                        <form action={lead.hideAction}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded-md px-2.5 py-1 text-xs text-on-surface-muted transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            Ocultar
                          </button>
                        </form>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
