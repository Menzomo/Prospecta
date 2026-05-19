'use client'

import { useActionState } from 'react'
import { syncRepliesForLeadAction } from '@/features/gmail/actions'

type Props = { leadId: string }

export function SyncButton({ leadId }: Props) {
  const bound = syncRepliesForLeadAction.bind(null, leadId)
  const [state, action, pending] = useActionState(bound, null)

  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        {pending ? 'Verificando...' : 'Verificar respostas'}
      </button>
      {!pending && state?.synced !== undefined && (
        <span className="text-xs text-gray-500">
          {state.synced === 0
            ? 'Nenhuma resposta nova'
            : `${state.synced} nova${state.synced > 1 ? 's' : ''}`}
        </span>
      )}
      {!pending && state?.error && (
        <span className="text-xs text-red-500">{state.error}</span>
      )}
    </form>
  )
}
