'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateVisitStatusAction } from '@/features/visits/actions'
import { updateVisitLeadStatusAction } from '@/features/leads/actions'
import { FollowupCreateForm } from '@/features/followups/components/FollowupCreateForm'
import { VisitCnpjForm } from './VisitCnpjForm'
import { VISIT_STATUSES, VISIT_STATUS_LABELS } from '@/types/visits'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/types/leads'
import type { VisitWithLeadInfo } from '@/types/visits'

type Props = {
  visit: VisitWithLeadInfo
}

const VISIT_STATUS_BADGE: Record<string, string> = {
  planejada: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
}

export function VisitCard({ visit }: Props) {
  const [showFollowup, setShowFollowup] = useState(false)
  const hasAddress = visit.latitude != null && visit.longitude != null
  const leadHref = visit.lead_id ? `/leads/${visit.lead_id}` : `/leads/global/${visit.user_lead_id}`

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline bg-surface-container p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={leadHref} className="text-sm font-semibold text-on-surface hover:text-primary hover:underline">
            {visit.company_name}
          </Link>
          {hasAddress ? (
            <p className="mt-0.5 text-xs text-on-surface-muted">{visit.address}</p>
          ) : (
            <p className="mt-0.5 text-xs text-red-500">Sem endereço confirmado</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${VISIT_STATUS_BADGE[visit.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {VISIT_STATUS_LABELS[visit.status as keyof typeof VISIT_STATUS_LABELS] ?? visit.status}
        </span>
      </div>

      {!hasAddress && <VisitCnpjForm leadId={visit.lead_id} userLeadId={visit.user_lead_id} />}

      <div className="flex flex-wrap items-center gap-2">
        <form action={updateVisitStatusAction.bind(null, visit.id)} className="flex items-center gap-1.5">
          <select
            name="status"
            defaultValue={visit.status}
            className="rounded-md border border-outline bg-surface-container px-2 py-1 text-xs text-on-surface outline-none focus:border-primary"
          >
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>{VISIT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="submit" className="cursor-pointer rounded-md border border-outline px-2 py-1 text-xs text-on-surface hover:bg-surface-low">
            Salvar
          </button>
        </form>

        <form action={updateVisitLeadStatusAction.bind(null, visit.lead_id, visit.user_lead_id)} className="flex items-center gap-1.5">
          <select
            name="status"
            defaultValue=""
            className="rounded-md border border-outline bg-surface-container px-2 py-1 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="" disabled>Mudar status do lead...</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="submit" className="cursor-pointer rounded-md border border-outline px-2 py-1 text-xs text-on-surface hover:bg-surface-low">
            Salvar
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowFollowup((v) => !v)}
          className="cursor-pointer rounded-md border border-outline px-2 py-1 text-xs text-on-surface hover:bg-surface-low"
        >
          {showFollowup ? 'Cancelar' : '+ Acompanhamento'}
        </button>
      </div>

      {showFollowup && (
        <div className="border-t border-outline pt-3">
          <FollowupCreateForm leadId={visit.lead_id} userLeadId={visit.user_lead_id} />
        </div>
      )}
    </div>
  )
}
