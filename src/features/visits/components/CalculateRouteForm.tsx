'use client'

import { useActionState } from 'react'
import { calculateRouteAction } from '@/features/visits/actions'

type Props = {
  scheduledDate: string
  stopCount: number
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem > 0 ? `${hours}h${rem}min` : `${hours}h`
}

export function CalculateRouteForm({ scheduledDate, stopCount }: Props) {
  const boundAction = calculateRouteAction.bind(null, scheduledDate)
  const [state, formAction, pending] = useActionState(boundAction, null)

  if (stopCount === 0) return null

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-5 shadow-card">
      <h2 className="mb-1 text-base font-semibold text-on-surface font-[--font-heading]">Calcular rota do dia</h2>
      <p className="mb-4 text-sm text-on-surface-muted">
        {stopCount} {stopCount === 1 ? 'visita planejada' : 'visitas planejadas'} com endereço confirmado. Custa R$ 0,50, descontado da carteira.
      </p>

      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">Ponto de partida</label>
          <input
            type="text"
            name="start_address"
            placeholder="Endereço de onde você vai sair"
            required
            className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Calculando...' : 'Calcular rota'}
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      {state?.result && (
        <div className="mt-4 rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Rota calculada!</p>
          <p className="mt-1 text-xs text-green-700">
            {formatDistance(state.result.totalDistanceMeters)} · {formatDuration(state.result.totalDurationSeconds)}
          </p>
          <a
            href={state.result.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Abrir no Google Maps →
          </a>
        </div>
      )}
    </div>
  )
}
