'use client'

import { useActionState } from 'react'
import { createFollowupAction } from '@/features/followups/actions'

type Props = {
  leadId: string
}

export function FollowupCreateForm({ leadId }: Props) {
  const boundAction = createFollowupAction.bind(null, leadId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-gray-100 pt-4">
      <p className="text-sm font-medium text-gray-700">Novo acompanhamento</p>

      <div className="flex flex-col gap-1">
        <label htmlFor="followup-title" className="text-xs font-medium text-gray-600">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          id="followup-title"
          name="title"
          type="text"
          placeholder="Ex: Ligar para apresentar proposta"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.title && (
          <p className="text-xs text-red-500">{state.errors.title[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="followup-due-at" className="text-xs font-medium text-gray-600">
          Data prevista <span className="text-red-500">*</span>
        </label>
        <input
          id="followup-due-at"
          name="due_at"
          type="datetime-local"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.due_at && (
          <p className="text-xs text-red-500">{state.errors.due_at[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="followup-notes" className="text-xs font-medium text-gray-600">
          Observações
        </label>
        <textarea
          id="followup-notes"
          name="notes"
          rows={2}
          placeholder="Detalhes adicionais..."
          className="resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Acompanhamento criado com sucesso.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Criar acompanhamento'}
      </button>
    </form>
  )
}
