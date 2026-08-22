'use client'

import { useState, useActionState } from 'react'
import { setLeadAddressAction, setLeadCnpjAction } from '@/features/leads/addressActions'

type Props = {
  leadId: string | null
  userLeadId: string | null
  currentAddress: string | null
  defaultCity?: string | null
}

const inputClass =
  'rounded-md border border-outline bg-surface-container px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function LeadAddressForm({ leadId, userLeadId, currentAddress, defaultCity }: Props) {
  const [mode, setMode] = useState<'address' | 'cnpj'>('address')
  const [editing, setEditing] = useState(!currentAddress)

  const boundAddressAction = setLeadAddressAction.bind(null, leadId, userLeadId)
  const [addressState, addressFormAction, addressPending] = useActionState(boundAddressAction, null)

  const boundCnpjAction = setLeadCnpjAction.bind(null, leadId, userLeadId)
  const [cnpjState, cnpjFormAction, cnpjPending] = useActionState(boundCnpjAction, null)

  const state = mode === 'address' ? addressState : cnpjState

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-on-surface">{currentAddress}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer shrink-0 text-xs text-primary hover:underline"
        >
          Atualizar
        </button>
      </div>
    )
  }

  if (state?.success) {
    return state.approximate ? (
      <p className="text-sm text-amber-700">
        Endereço salvo, mas só achamos a localização aproximada (bairro/cidade) — a rua exata não está mapeada nesse
        serviço. A rota pode ficar imprecisa nesse ponto. Atualize a página pra ver.
      </p>
    ) : (
      <p className="text-sm text-green-700">Endereço encontrado e salvo — atualize a página pra ver.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => setMode('address')}
          className={`cursor-pointer ${mode === 'address' ? 'font-medium text-primary' : 'text-on-surface-muted hover:text-on-surface'}`}
        >
          Digitar endereço
        </button>
        <button
          type="button"
          onClick={() => setMode('cnpj')}
          className={`cursor-pointer ${mode === 'cnpj' ? 'font-medium text-primary' : 'text-on-surface-muted hover:text-on-surface'}`}
        >
          Buscar por CNPJ
        </button>
      </div>

      {mode === 'address' ? (
        <form action={addressFormAction} className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input type="text" name="street" placeholder="Rua / Avenida" required className={inputClass} />
            <input type="text" name="number" placeholder="Nº" className={`w-16 ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="neighborhood" placeholder="Bairro" className={inputClass} />
            <input
              type="text"
              name="city"
              placeholder="Cidade"
              required
              defaultValue={defaultCity ?? ''}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input type="text" name="state" placeholder="Estado (RS, SP...)" className={inputClass} />
            <button
              type="submit"
              disabled={addressPending}
              className="cursor-pointer shrink-0 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addressPending ? 'Buscando...' : 'Salvar endereço'}
            </button>
          </div>
        </form>
      ) : (
        <form action={cnpjFormAction} className="flex items-center gap-2">
          <input
            type="text"
            name="cnpj"
            placeholder="CNPJ (só números)"
            inputMode="numeric"
            className={`w-40 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={cnpjPending}
            className="cursor-pointer shrink-0 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cnpjPending ? 'Buscando...' : 'Buscar endereço'}
          </button>
        </form>
      )}

      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      {currentAddress && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="self-start cursor-pointer text-xs text-on-surface-muted hover:underline"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
