'use client'

import { useState, useActionState } from 'react'
import { updateLeadAction } from '@/features/leads/actions'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/types/leads'
import type { Lead, LeadStatus } from '@/types/leads'

const SELECTABLE_STATUSES = LEAD_STATUSES.filter(
  (s) => s !== 'convertido_email' && s !== 'convertido_telefonia'
)

type Props = {
  lead: Lead
}

export function LeadEditForm({ lead }: Props) {
  const boundAction = updateLeadAction.bind(null, lead.id)
  const [state, formAction, pending] = useActionState(boundAction, null)
  const [statusValue, setStatusValue] = useState<LeadStatus>(lead.status as LeadStatus)
  const [showChannelPicker, setShowChannelPicker] = useState(false)

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as LeadStatus
    if (val === 'convertido') {
      setShowChannelPicker(true)
    } else {
      setStatusValue(val)
      setShowChannelPicker(false)
    }
  }

  function pickChannel(channel: 'email' | 'telefonia') {
    setStatusValue(channel === 'email' ? 'convertido_email' : 'convertido_telefonia')
    setShowChannelPicker(false)
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="company_name" className="text-sm font-medium text-gray-700">
          Empresa <span className="text-red-500">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          defaultValue={lead.company_name}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.company_name && (
          <p className="text-xs text-red-500">{state.errors.company_name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="contact_name" className="text-sm font-medium text-gray-700">
            Contato
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            defaultValue={lead.contact_name ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium text-gray-700">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={lead.city ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={lead.email ?? ''}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {state?.errors?.email && (
            <p className="text-xs text-red-500">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={lead.phone ?? ''}
            placeholder="(54) 99999-9999"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="website" className="text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          id="website"
          name="website"
          type="text"
          defaultValue={lead.website ?? ''}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.website && (
          <p className="text-xs text-red-500">{state.errors.website[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium text-gray-700">
          Status
        </label>
        {/* hidden input carrega o valor real (pode ser convertido_email / convertido_telefonia) */}
        <input type="hidden" name="status" value={statusValue} />
        <select
          id="status"
          value={showChannelPicker ? 'convertido' : statusValue}
          onChange={handleStatusChange}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {SELECTABLE_STATUSES.map((s) => (
            <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
          ))}
          {/* opções legíveis quando já estão setadas */}
          {statusValue === 'convertido_email' && (
            <option value="convertido_email">Convertido — Email</option>
          )}
          {statusValue === 'convertido_telefonia' && (
            <option value="convertido_telefonia">Convertido — Telefonia</option>
          )}
        </select>

        {showChannelPicker && (
          <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-2 text-xs font-medium text-emerald-800">Como foi a conversão?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => pickChannel('email')}
                className="flex-1 cursor-pointer rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => pickChannel('telefonia')}
                className="flex-1 cursor-pointer rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                📞 Telefonia
              </button>
            </div>
          </div>
        )}

        {state?.errors?.status && (
          <p className="text-xs text-red-500">{state.errors.status[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-gray-700">
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={lead.notes ?? ''}
          className="resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Lead atualizado com sucesso.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
