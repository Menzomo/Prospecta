'use client'

import { useActionState } from 'react'
import { setCreditCardAction } from '@/features/settings/actions'

type Props = {
  hasCard: boolean
}

const inputClass =
  'rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function CreditCardForm({ hasCard }: Props) {
  const [state, formAction, pending] = useActionState(setCreditCardAction, null)

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <p className="text-sm font-semibold text-on-surface">
        {hasCard ? 'Trocar cartão' : 'Adicionar cartão — cobrança automática todo mês'}
      </p>
      <p className="mt-1 text-sm text-on-surface-muted">
        {hasCard
          ? 'O novo cartão passa a valer a partir da próxima cobrança.'
          : 'Sem precisar pagar via Pix todo mês — a cobrança sai sozinha no cartão.'}
      </p>

      {state?.success ? (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Cartão cadastrado com sucesso.
        </p>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="holder_name" className="text-sm font-medium text-on-surface">Nome no cartão</label>
            <input id="holder_name" name="holder_name" type="text" required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="number" className="text-sm font-medium text-on-surface">Número do cartão</label>
            <input id="number" name="number" type="text" inputMode="numeric" required className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="expiry_month" className="text-sm font-medium text-on-surface">Mês</label>
              <input id="expiry_month" name="expiry_month" type="text" placeholder="MM" inputMode="numeric" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="expiry_year" className="text-sm font-medium text-on-surface">Ano</label>
              <input id="expiry_year" name="expiry_year" type="text" placeholder="AAAA" inputMode="numeric" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ccv" className="text-sm font-medium text-on-surface">CVV</label>
              <input id="ccv" name="ccv" type="text" inputMode="numeric" required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="postal_code" className="text-sm font-medium text-on-surface">CEP</label>
              <input id="postal_code" name="postal_code" type="text" inputMode="numeric" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="address_number" className="text-sm font-medium text-on-surface">Número do endereço</label>
              <input id="address_number" name="address_number" type="text" required className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="phone" className="text-sm font-medium text-on-surface">Telefone</label>
            <input id="phone" name="phone" type="tel" className={inputClass} />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Salvando...' : hasCard ? 'Trocar cartão' : 'Adicionar cartão'}
          </button>
        </form>
      )}
    </div>
  )
}
