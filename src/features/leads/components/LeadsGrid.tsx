'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { LeadStatus } from '@/types/leads'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { CallButton } from '@/features/calls/components/CallButton'

const PAGE_SIZE = 12

export type LeadCardData = {
  key: string
  company_name: string
  email: string | null
  phone: string | null
  city: string | null
  category_name: string | null
  status: LeadStatus
  leadHref: string
  sendHref: string
  hideAction?: (_formData: FormData) => Promise<void>
  leadId?: string | null
  userLeadId?: string | null
}

export function LeadsGrid({ leads, hasSettings = false }: { leads: LeadCardData[]; hasSettings?: boolean }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const visible = leads.slice(0, limit)
  const remaining = leads.length - limit

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((lead) => (
          <div
            key={lead.key}
            className="flex flex-col rounded-xl border border-outline bg-surface-container p-5 shadow-card transition-shadow hover:shadow-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Avatar name={lead.company_name} size="md" />
                <p className="font-semibold leading-snug text-on-surface">{lead.company_name}</p>
              </div>
              <div className="shrink-0 pt-0.5">
                <StatusBadge status={lead.status} />
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-on-surface-muted">
              {lead.category_name && <p>{lead.category_name}</p>}
              {lead.email && <p>{lead.email}</p>}
              {lead.city && <p>{lead.city}</p>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <Link
                href={lead.sendHref}
                className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Enviar email
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
              {lead.hideAction && (
                <form action={lead.hideAction}>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-on-surface-muted transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    Ocultar
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="cursor-pointer rounded-lg border border-outline bg-surface-container px-6 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low"
          >
            Ver mais {remaining} {remaining === 1 ? 'lead' : 'leads'}
          </button>
        </div>
      )}
    </>
  )
}
