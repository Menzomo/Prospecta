'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { payOverdueViaPixAction } from '@/features/settings/actions'
import { createClient } from '@/lib/supabase/client'

export function PayOverdueViaPixButton() {
  const [state, formAction, pending] = useActionState(payOverdueViaPixAction, null)
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!state?.qrCode || confirmed) return

    const supabase = createClient()
    const id = setInterval(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('profiles').select('subscription_status').single()
      if (data?.subscription_status === 'active') {
        setConfirmed(true)
        clearInterval(id)
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(id)
  }, [state?.qrCode, confirmed, router])

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
