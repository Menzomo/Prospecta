'use client'

import { useState } from 'react'
import { cancelPendingChargesAction } from '@/features/admin/actions'

export function AdminCancelChargesButton({ userId, email }: { userId: string; email: string }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    if (!confirm(`Cancelar as cobranças pendentes de ${email} no Asaas? Essa ação não pode ser desfeita.`)) return
    setPending(true)
    setMessage(null)
    const result = await cancelPendingChargesAction(userId)
    setPending(false)
    setMessage(result.ok ? `${result.canceled} cobrança(s) cancelada(s).` : result.error ?? 'Erro.')
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="cursor-pointer rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
      >
        {pending ? 'Cancelando...' : 'Cancelar cobrança pendente'}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  )
}
