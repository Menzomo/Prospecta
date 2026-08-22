'use client'

import { useActionState } from 'react'
import { setLeadCnpjAction } from '@/features/leads/addressActions'

type Props = {
  leadId: string | null
  userLeadId: string | null
}

export function VisitCnpjForm({ leadId, userLeadId }: Props) {
  const boundAction = setLeadCnpjAction.bind(null, leadId, userLeadId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  if (state?.success) {
    return <p className="text-xs text-green-700">Endereço encontrado e salvo — atualize a página pra ver.</p>
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        type="text"
        name="cnpj"
        placeholder="CNPJ (só números)"
        inputMode="numeric"
        className="w-40 rounded-md border border-outline bg-surface-container px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Buscando...' : 'Buscar endereço'}
      </button>
      {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
    </form>
  )
}
