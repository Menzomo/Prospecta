'use client'

import type { PhoneCallState } from '../hooks/usePhoneCall'

const CONFIG: Record<PhoneCallState, { label: string; color: string; pulse: boolean }> = {
  idle:         { label: 'Pronto',          color: 'bg-surface-low text-on-surface-muted',  pulse: false },
  initializing: { label: 'Preparando…',     color: 'bg-yellow-100 text-yellow-700',          pulse: true  },
  connecting:   { label: 'Conectando…',     color: 'bg-blue-100 text-blue-700',              pulse: true  },
  ringing:      { label: 'Chamando…',       color: 'bg-blue-100 text-blue-700',              pulse: true  },
  'in-progress':{ label: 'Em andamento',    color: 'bg-green-100 text-green-700',            pulse: true  },
  ended:        { label: 'Encerrada',       color: 'bg-surface-low text-on-surface-muted',   pulse: false },
  error:        { label: 'Erro',            color: 'bg-red-100 text-red-700',                pulse: false },
}

type Props = {
  state: PhoneCallState
}

export function CallStatusIndicator({ state }: Props) {
  const { label, color, pulse } = CONFIG[state]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'in-progress' ? 'bg-green-500' : state === 'error' ? 'bg-red-500' : 'bg-current'} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
