'use client'

import { useState, useActionState } from 'react'
import { calculateRouteAction } from '@/features/visits/actions'

type Props = {
  scheduledDate: string
  stopCount: number
}

const inputClass =
  'rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary'

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

  const [mode, setMode] = useState<'gps' | 'address'>('gps')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsError('Seu navegador não suporta localização automática. Digite o endereço.')
      setMode('address')
      return
    }
    setLocating(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada. Digite o endereço abaixo.'
            : 'Não foi possível pegar sua localização. Digite o endereço abaixo.'
        )
        setMode('address')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (stopCount === 0) return null

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-5 shadow-card">
      <h2 className="mb-1 text-base font-semibold text-on-surface font-[--font-heading]">Calcular rota do dia</h2>
      <p className="mb-4 text-sm text-on-surface-muted">
        {stopCount} {stopCount === 1 ? 'visita planejada' : 'visitas planejadas'} com endereço confirmado. Custa R$ 0,50, descontado da carteira.
      </p>

      <div className="mb-3 flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => setMode('gps')}
          className={`cursor-pointer ${mode === 'gps' ? 'font-medium text-primary' : 'text-on-surface-muted hover:text-on-surface'}`}
        >
          Usar minha localização
        </button>
        <button
          type="button"
          onClick={() => setMode('address')}
          className={`cursor-pointer ${mode === 'address' ? 'font-medium text-primary' : 'text-on-surface-muted hover:text-on-surface'}`}
        >
          Digitar endereço
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        {mode === 'gps' ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="start_lat" value={coords?.lat ?? ''} />
            <input type="hidden" name="start_lng" value={coords?.lng ?? ''} />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="cursor-pointer rounded-lg border border-outline px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locating ? 'Localizando...' : coords ? '📍 Localização capturada — atualizar' : '📍 Usar minha localização atual'}
            </button>
            {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input type="text" name="street" placeholder="Rua / Avenida" className={inputClass} />
              <input type="text" name="number" placeholder="Nº" className={`w-16 ${inputClass}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" name="neighborhood" placeholder="Bairro" className={inputClass} />
              <input type="text" name="city" placeholder="Cidade" className={inputClass} />
            </div>
            <input type="text" name="state" placeholder="Estado (RS, SP...)" className={inputClass} />
          </div>
        )}

        <button
          type="submit"
          disabled={pending || (mode === 'gps' && !coords)}
          className="cursor-pointer self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
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
