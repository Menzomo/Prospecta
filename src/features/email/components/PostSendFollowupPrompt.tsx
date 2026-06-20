'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createNoReplyFollowupAction } from '@/features/followups/actions'

function daysFromNowUtc(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

// Converts "YYYY-MM-DDTHH:MM" from datetime-local to UTC ISO (BRT = UTC-3, no DST since 2019)
function localToUtcIso(localValue: string): string {
  return new Date(`${localValue}:00-03:00`).toISOString()
}

type Props = {
  leadId?: string | null
  userLeadId?: string | null
  emailMessageId: string
}

export function PostSendFollowupPrompt({ leadId, userLeadId, emailMessageId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const returnPath = leadId ? `/leads/${leadId}` : `/leads/global/${userLeadId}`

  function handleSkip() {
    router.push(returnPath)
  }

  function handleQuickCreate(days: number) {
    startTransition(async () => {
      const dueAt = daysFromNowUtc(days)
      const result = await createNoReplyFollowupAction(leadId ?? null, userLeadId ?? null, emailMessageId, dueAt)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(returnPath)
      }
    })
  }

  function handleCustomCreate() {
    if (!customDate) return
    startTransition(async () => {
      const dueAt = localToUtcIso(customDate)
      const result = await createNoReplyFollowupAction(leadId ?? null, userLeadId ?? null, emailMessageId, dueAt)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(returnPath)
      }
    })
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
      <p className="text-sm font-semibold text-green-800">Email enviado!</p>
      <p className="mt-1.5 text-sm text-green-700">
        Criar acompanhamento caso o lead não responda?
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickCreate(2)}
          disabled={isPending}
          className="cursor-pointer rounded-lg border border-green-600 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Lembrar em 2 dias
        </button>
        <button
          type="button"
          onClick={() => handleQuickCreate(5)}
          disabled={isPending}
          className="cursor-pointer rounded-lg border border-green-600 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Lembrar em 5 dias
        </button>
        <button
          type="button"
          onClick={() => setShowDatePicker(true)}
          disabled={isPending}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Escolher data
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="cursor-pointer px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Não criar
        </button>
      </div>

      {showDatePicker && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCustomCreate}
            disabled={isPending || !customDate}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Criando...' : 'Criar'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
