'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { payOverdueViaPixAction, checkPixPaymentStatusAction } from '@/features/settings/actions'
import { CopyPixPayloadButton } from '@/features/settings/components/CopyPixPayloadButton'

export function PayOverdueViaPixButton() {
  const [state, formAction, pending] = useActionState(payOverdueViaPixAction, null)
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!state?.qrCode || !state.paymentId || confirmed) return

    const paymentId = state.paymentId
    const id = setInterval(async () => {
      const { paid } = await checkPixPaymentStatusAction(paymentId)
      if (paid) {
        setConfirmed(true)
        clearInterval(id)
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(id)
  }, [state?.qrCode, state?.paymentId, confirmed, router])

  if (confirmed) {
    return <p className="mt-3 text-sm font-semibold text-green-600">Pagamento confirmado! Assinatura reativada.</p>
  }

  if (state?.qrCode) {
    return (
      <div className="mt-3 flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${state.qrCode}`}
          alt="QR Code Pix"
          className="h-48 w-48 rounded-lg border border-outline"
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
        {state.payload && <CopyPixPayloadButton payload={state.payload} />}
        <p className="text-xs text-on-surface-muted">Aguardando confirmação do pagamento...</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-3">
      {state?.error && <p className="mb-2 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Gerando Pix...' : 'Pagar via Pix agora'}
      </button>
    </form>
  )
}
