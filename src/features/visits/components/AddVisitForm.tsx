'use client'

import { useActionState, useState } from 'react'
import { createVisitAction } from '@/features/visits/actions'
import type { PickableLead } from './VisitasBoard'

type Props = {
  leads: PickableLead[]
  defaultDate: string
}

export function AddVisitForm({ leads, defaultDate }: Props) {
  const [selectedKey, setSelectedKey] = useState('')
  const selected = leads.find((l) => l.key === selectedKey) ?? null
  const boundAction = createVisitAction.bind(null, selected?.leadId ?? null, selected?.userLeadId ?? null)
  const [state, formAction, pending] = useActionState(boundAction, null)

  const manualLeads = leads.filter((l) => l.leadId)
  const searchLeads = leads.filter((l) => l.userLeadId)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-outline bg-surface-container p-5 shadow-card sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Lead</label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          required
        >
          <option value="">Selecione um lead</option>
          {manualLeads.length > 0 && (
            <optgroup label="Meus leads">
              {manualLeads.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.company_name}{!l.hasAddress ? ' (sem endereço)' : ''}
                </option>
              ))}
            </optgroup>
          )}
          {searchLeads.length > 0 && (
            <optgroup label="Leads da busca">
              {searchLeads.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.company_name}{!l.hasAddress ? ' (sem endereço)' : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Data da visita</label>
        <input
          type="date"
          name="scheduled_date"
          defaultValue={defaultDate}
          required
          className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedKey}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Agendando...' : '+ Agendar visita'}
      </button>

      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
    </form>
  )
}
