'use client'

import { useActionState } from 'react'
import { addEmailToGlobalLeadAction } from '@/features/admin/actions'

type Props = {
  leadId: string
  currentEmail: string | null
}

export function GlobalLeadEmailForm({ leadId, currentEmail }: Props) {
  const boundAction = addEmailToGlobalLeadAction.bind(null, leadId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={currentEmail ?? ''}
          placeholder="email@empresa.com.br"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.error && (
          <p className="text-xs text-red-500">{state.error}</p>
        )}
      </div>

      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Email adicionado e lead liberado para busca.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Salvando...' : state?.success ? 'Salvar novamente' : 'Salvar email e liberar lead'}
      </button>
    </form>
  )
}
