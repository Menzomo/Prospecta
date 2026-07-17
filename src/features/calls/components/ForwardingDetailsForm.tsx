'use client'

import { useActionState } from 'react'
import { completeForwardingDetailsAction } from '@/features/calls/actions'

export function ForwardingDetailsForm() {
  const [state, formAction, pending] = useActionState(completeForwardingDetailsAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <p className="text-sm text-on-surface-muted">
        Falta completar seu cadastro pra receber ligações encaminhadas no número já atribuído a você.
      </p>

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
        {pending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
