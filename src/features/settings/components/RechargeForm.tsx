'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type RechargeResult = { qrCode: string; payload: string } | null

export function RechargeForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RechargeResult>(null)
  const [confirmed, setConfirmed] = useState(false)
  const initialBalanceRef = useRef<number | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))

    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao gerar recarga.')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: balanceRow } = await supabase.from('wallet_balances').select('balance').maybeSingle()
      initialBalanceRef.current = balanceRow ? Number(balanceRow.balance) : 0

      setResult({ qrCode: data.qrCode, payload: data.payload })
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (!result || confirmed) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const id = setInterval(async () => {
      const { data } = await supabase.from('wallet_balances').select('balance').maybeSingle()
      const balance = data ? Number(data.balance) : 0
      if (initialBalanceRef.current !== null && balance > initialBalanceRef.current) {
        setConfirmed(true)
        clearInterval(id)
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(id)
  }, [result, confirmed, router])

  if (result) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card flex flex-col items-center gap-4 text-center">
        {confirmed ? (
          <p className="text-sm font-semibold text-green-600">Pagamento confirmado! Saldo atualizado.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-on-surface">Escaneie o QR Code Pix pra confirmar a recarga</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${result.qrCode}`}
              alt="QR Code Pix"
              className="h-56 w-56 rounded-lg border border-outline"
            />
            <textarea
              readOnly
              value={result.payload}
              className="w-full resize-none rounded-lg border border-outline bg-surface-low px-3 py-2 text-xs text-on-surface-muted"
              rows={3}
              onClick={(e) => e.currentTarget.select()}
            />
            <p className="text-xs text-on-surface-muted">Aguardando confirmação do pagamento...</p>
          </>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <p className="text-sm font-semibold text-on-surface">Recarregar créditos</p>
      <p className="mt-1 text-sm text-on-surface-muted">Pagamento por Pix, mínimo de R$ 30,00.</p>

      <input
        type="number"
        name="amount"
        min={30}
        step="0.01"
        defaultValue={30}
        required
        className="mt-3 w-full rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Gerando...' : 'Gerar Pix'}
      </button>
    </form>
  )
}
