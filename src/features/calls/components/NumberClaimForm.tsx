'use client'

import { useActionState } from 'react'
import { claimTelnyxNumberAction } from '@/features/calls/actions'
import type { TelnyxNumber } from '@/repositories/telnyxNumberRepository'

function formatPhoneDisplay(e164: string): string {
  const match = e164.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/)
  if (!match) return e164
  return `(${match[1]}) ${match[2]}-${match[3]}`
}

type Props = {
  availableNumbers: TelnyxNumber[]
}

export function NumberClaimForm({ availableNumbers }: Props) {
  const [state, formAction, pending] = useActionState(claimTelnyxNumberAction, null)

  if (availableNumbers.length === 0) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
        <p className="text-sm text-on-surface-muted">
          Nenhum número disponível no momento. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">
          Escolha seu número <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-col gap-2">
          {availableNumbers.map((n) => (
            <label
              key={n.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-outline px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input type="radio" name="number_id" value={n.id} required className="accent-primary" />
              {formatPhoneDisplay(n.phone_number)}
            </label>
          ))}
        </div>
        {state?.errors?.number_id && (
          <p className="text-xs text-red-500">{state.errors.number_id[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cpf_cnpj" className="text-sm font-medium text-on-surface">
          CPF ou CNPJ <span className="text-red-500">*</span>
        </label>
        <input
          id="cpf_cnpj"
          name="cpf_cnpj"
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-on-surface-muted">
          O número fica sob responsabilidade legal desta conta perante a ANATEL.
        </p>
        {state?.errors?.cpf_cnpj && (
          <p className="text-xs text-red-500">{state.errors.cpf_cnpj[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="forwarding_cell_phone" className="text-sm font-medium text-on-surface">
          Celular para encaminhamento <span className="text-red-500">*</span>
        </label>
        <input
          id="forwarding_cell_phone"
          name="forwarding_cell_phone"
          type="tel"
          placeholder="+5511999999999"
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-on-surface-muted">
          Quando um lead ligar de volta, a chamada é encaminhada pra este celular. Formato E.164: +5511999999999
        </p>
        {state?.errors?.forwarding_cell_phone && (
          <p className="text-xs text-red-500">{state.errors.forwarding_cell_phone[0]}</p>
        )}
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Reivindicando...' : 'Confirmar número'}
      </button>
    </form>
  )
}
