'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeAction } from '@/features/settings/actions'
import { createClient } from '@/lib/supabase/client'

type Props = {
  needsCpfCnpj: boolean
}

export function SubscribeForm({ needsCpfCnpj }: Props) {
  const [state, formAction, pending] = useActionState(subscribeAction, null)
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!state?.qrCode || confirmed) return

    const supabase = createClient()
    const id = setInterval(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('profiles')
        .select('subscription_status')
        .single()

      if (data?.subscription_status === 'active') {
        setConfirmed(true)
        clearInterval(id)
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(id)
  }, [state?.qrCode, confirmed, router])

  if (state?.qrCode) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card flex flex-col items-center gap-4 text-center">
        {confirmed ? (
          <p className="text-sm font-semibold text-green-600">Pagamento confirmado! Assinatura ativa.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-on-surface">Escaneie o QR Code Pix pra confirmar a assinatura</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${state.qrCode}`}
              alt="QR Code Pix"
              className="h-56 w-56 rounded-lg border border-outline"
            />
            {state.payload && (
              <textarea
                readOnly
                value={state.payload}
                className="w-full resize-none rounded-lg border border-outline bg-surface-low px-3 py-2 text-xs text-on-surface-muted"
                rows={3}
                onClick={(e) => e.currentTarget.select()}
              />
            )}
            <p className="text-xs text-on-surface-muted">Aguardando confirmação do pagamento...</p>
          </>
        )}
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <div>
        <p className="text-base font-bold text-on-surface font-[--font-heading]">Prospecta — R$ 150,00/mês</p>
        <p className="mt-1 text-sm text-on-surface-muted">Assinatura recorrente via Pix ou cartão.</p>
      </div>

      {needsCpfCnpj && (
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
          {state?.errors?.cpf_cnpj && (
            <p className="text-xs text-red-500">{state.errors.cpf_cnpj[0]}</p>
          )}
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Gerando cobrança...' : 'Assinar'}
      </button>
    </form>
  )
}
