'use client'

import { useRouter } from 'next/navigation'
import { AddVisitForm } from './AddVisitForm'
import { VisitCard } from './VisitCard'
import { CalculateRouteForm } from './CalculateRouteForm'
import type { VisitWithLeadInfo } from '@/types/visits'

export type PickableLead = {
  key: string
  leadId: string | null
  userLeadId: string | null
  company_name: string
  hasAddress: boolean
}

type Props = {
  selectedDate: string
  today: string
  visits: VisitWithLeadInfo[]
  upcomingDates: string[]
  pickableLeads: PickableLead[]
}

function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function VisitasBoard({ selectedDate, today, visits, upcomingDates, pickableLeads }: Props) {
  const router = useRouter()

  function goToDate(date: string) {
    router.push(`/visitas?date=${date}`)
  }

  const plannedWithAddress = visits.filter(
    (v) => v.status === 'planejada' && v.latitude != null && v.longitude != null
  ).length

  return (
    <div className="flex flex-col gap-5">
      <AddVisitForm leads={pickableLeads} defaultDate={selectedDate} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => goToDate(e.target.value)}
          className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {selectedDate !== today && (
          <button
            type="button"
            onClick={() => goToDate(today)}
            className="cursor-pointer rounded-lg border border-outline px-3 py-2 text-sm text-on-surface hover:bg-surface-low"
          >
            Hoje
          </button>
        )}
        {upcomingDates.filter((d) => d !== selectedDate).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => goToDate(d)}
            className="cursor-pointer rounded-full border border-outline px-3 py-1.5 text-xs text-on-surface-muted hover:bg-surface-low"
          >
            {formatDateLabel(d)}
          </button>
        ))}
      </div>

      {visits.length === 0 ? (
        <div className="rounded-xl border border-outline bg-surface-container p-8 text-center shadow-card">
          <p className="text-sm text-on-surface-muted">Nenhuma visita agendada pra {formatDateLabel(selectedDate)}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}

      <CalculateRouteForm scheduledDate={selectedDate} stopCount={plannedWithAddress} />
    </div>
  )
}
