'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { completeFollowupAction, updateFollowupAction } from '@/features/followups/actions'
import type { Followup } from '@/types/followups'

type Props = {
  followup: Followup
  leadId: string
}

function formatDueAt(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FollowupItem({ followup, leadId }: Props) {
  const [editing, setEditing] = useState(false)
  const boundUpdate = updateFollowupAction.bind(null, followup.id, leadId)
  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)

  useEffect(() => {
    if (updateState?.success) setEditing(false)
  }, [updateState?.success])

  const overdue = new Date(followup.due_at) < new Date()
  const defaultDueAt = new Date(followup.due_at).toISOString().slice(0, 16)

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      {/* Info row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{followup.title}</p>
          <p className={`mt-0.5 text-xs ${overdue ? 'font-medium text-red-500' : 'text-gray-500'}`}>
            {overdue ? 'Atrasado · ' : ''}{formatDueAt(followup.due_at)}
          </p>
          {followup.notes && (
            <p className="mt-1 text-xs text-gray-500">{followup.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>

          <form action={completeFollowupAction.bind(null, followup.id, leadId)}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
            >
              Concluir
            </button>
          </form>
        </div>
      </div>

      {/* Edit form (below info, only when editing) */}
      {editing && (
        <form action={updateAction} className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              defaultValue={followup.title}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {updateState?.errors?.title && (
              <p className="text-xs text-red-500">{updateState.errors.title[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Data prevista <span className="text-red-500">*</span>
            </label>
            <input
              name="due_at"
              type="datetime-local"
              defaultValue={defaultDueAt}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {updateState?.errors?.due_at && (
              <p className="text-xs text-red-500">{updateState.errors.due_at[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Observações</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={followup.notes ?? ''}
              className="resize-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {updateState?.error && (
            <p className="text-xs text-red-500">{updateState.error}</p>
          )}

          <button
            type="submit"
            disabled={updatePending}
            className="self-start rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {updatePending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}
    </div>
  )
}
