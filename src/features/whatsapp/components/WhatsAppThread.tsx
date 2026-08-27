'use client'

import { useActionState } from 'react'
import { sendWhatsAppMessageAction } from '@/features/whatsapp/actions'
import type { WhatsAppMessage } from '@/types/whatsapp'

type Props = {
  leadId: string | null
  userLeadId: string | null
  messages: WhatsAppMessage[]
}

const WINDOW_MS = 24 * 60 * 60 * 1000

function isWithinWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < WINDOW_MS
}

export function WhatsAppThread({ leadId, userLeadId, messages }: Props) {
  const boundAction = sendWhatsAppMessageAction.bind(null, leadId, userLeadId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound')
  const withinWindow = !!lastInbound && isWithinWindow(lastInbound.created_at)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline bg-surface-container p-4 shadow-card">
      <h2 className="text-base font-semibold text-on-surface font-[--font-heading]">WhatsApp</h2>

      {messages.length === 0 ? (
        <p className="text-sm text-on-surface-muted">Nenhuma mensagem ainda.</p>
      ) : (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.direction === 'outbound'
                  ? 'self-end bg-primary/10 text-on-surface'
                  : 'self-start bg-surface-low text-on-surface'
              }`}
            >
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] text-on-surface-muted">
                {new Date(m.created_at).toLocaleString('pt-BR')}
                {m.direction === 'outbound' && ` · ${m.status}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {!withinWindow && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Fora da janela de 24h — só é possível responder livremente depois que o lead manda uma mensagem.
        </p>
      )}

      <form action={formAction} className="flex items-center gap-2">
        <input
          type="text"
          name="body"
          placeholder="Digite uma mensagem..."
          disabled={!withinWindow}
          className="flex-1 rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || !withinWindow}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
    </div>
  )
}
