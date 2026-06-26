'use client'

import { useState } from 'react'
import { PhoneCallModal } from './PhoneCallModal'

type Props = {
  phone: string | null
  hasSettings: boolean
  companyName: string
  leadId?: string | null
  userLeadId?: string | null
}

export function CallButton({ phone, hasSettings, companyName, leadId, userLeadId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const disabled = !phone || !hasSettings

  function getTitle() {
    if (!phone) return 'Lead sem telefone cadastrado'
    if (!hasSettings) return 'Configure a Telefonia em Configurações'
    return `Ligar para ${phone}`
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={getTitle()}
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          disabled
            ? 'cursor-not-allowed border border-outline bg-surface-low text-on-surface-muted opacity-60'
            : 'cursor-pointer border border-outline bg-surface-container text-on-surface hover:bg-surface-low'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.61a16 16 0 0 0 6.29 6.29l.91-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Ligar
      </button>

      {isOpen && phone && (
        <PhoneCallModal
          phone={phone}
          companyName={companyName}
          leadId={leadId}
          userLeadId={userLeadId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
