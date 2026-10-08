'use client'

import { useState } from 'react'

/** Botão "copiar" pro código Pix copia-e-cola — usado no fluxo de assinar e de renovar. */
export function CopyPixPayloadButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      // Clipboard API pode falhar (contexto não seguro, permissão negada) —
      // fallback pro jeito antigo.
      const textarea = document.createElement('textarea')
      textarea.value = payload
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="cursor-pointer rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low"
    >
      {copied ? 'Copiado!' : 'Copiar código Pix'}
    </button>
  )
}
