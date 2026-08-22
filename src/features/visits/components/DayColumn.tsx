import { VisitCard } from './VisitCard'
import { CalculateRouteForm } from './CalculateRouteForm'
import type { VisitWithLeadInfo } from '@/types/visits'

type Props = {
  date: string
  today: string
  visits: VisitWithLeadInfo[]
}

export function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function DayColumn({ date, today, visits }: Props) {
  const isToday = date === today
  const plannedWithAddress = visits.filter(
    (v) => v.status === 'planejada' && v.latitude != null && v.longitude != null
  ).length

  return (
    <div className="flex w-96 shrink-0 flex-col gap-3 rounded-xl border border-outline bg-surface-low/40 p-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-on-surface">{formatDateLabel(date)}</h3>
        {isToday && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Hoje</span>
        )}
        {visits.length > 0 && (
          <span className="ml-auto text-xs text-on-surface-muted">{visits.length}</span>
        )}
      </div>

      {visits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline p-4 text-center text-xs text-on-surface-muted">
          Nenhuma visita agendada.
        </p>
      ) : (
        // Depois de ~4 visitas o card cresceria demais e empurraria a página
        // toda pra baixo — rola só dentro da coluna a partir daí.
        <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}

      <CalculateRouteForm scheduledDate={date} stopCount={plannedWithAddress} />
    </div>
  )
}
