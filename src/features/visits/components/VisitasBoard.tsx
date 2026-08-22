import { AddVisitForm } from './AddVisitForm'
import { DayColumn } from './DayColumn'
import type { VisitWithLeadInfo } from '@/types/visits'

export type PickableLead = {
  key: string
  leadId: string | null
  userLeadId: string | null
  company_name: string
  hasAddress: boolean
}

export type DayColumnData = {
  date: string
  visits: VisitWithLeadInfo[]
}

type Props = {
  today: string
  columns: DayColumnData[]
  pickableLeads: PickableLead[]
}

export function VisitasBoard({ today, columns, pickableLeads }: Props) {
  const hasAnyVisit = columns.some((c) => c.visits.length > 0)

  return (
    <div className="flex flex-col gap-5">
      <AddVisitForm leads={pickableLeads} defaultDate={today} />

      {!hasAnyVisit ? (
        <div className="rounded-xl border border-outline bg-surface-container p-8 text-center shadow-card">
          <p className="text-sm text-on-surface-muted">Nenhuma visita agendada ainda.</p>
        </div>
      ) : (
        // Um card por dia — se tiver visita em mais de um dia, vira um
        // kanban horizontal (cada dia é uma coluna que rola independente).
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => (
            <DayColumn key={col.date} date={col.date} today={today} visits={col.visits} />
          ))}
        </div>
      )}
    </div>
  )
}
