'use client'

import { useActionState } from 'react'
import { sendContactMessageAction } from '@/features/settings/actions'

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessageAction, null)

  if (state?.success) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
        <p className="text-sm font-semibold text-green-700">Mensagem enviada!</p>
        <p className="mt-1 text-sm text-on-surface-muted">
          Nossa equipe vai responder direto no seu email o quanto antes.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <label htmlFor="subject" className="text-sm font-medium text-on-surface">Assunto</label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium text-on-surface">Mensagem</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="resize-none rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Enviando...' : 'Enviar mensagem'}
      </button>
    </form>
  )
}
