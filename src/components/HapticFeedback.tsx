'use client'

import { useEffect } from 'react'

/**
 * Vibração leve ao tocar em botões/links — só existe em Android/Chrome
 * (navigator.vibrate). iOS/Safari não expõe essa API pra sites (só apps
 * nativos), então lá isso simplesmente não faz nada, sem erro.
 *
 * Um listener global em vez de mexer em cada botão do app — cobre tudo
 * automaticamente, inclusive botões/links adicionados no futuro.
 */
export function HapticFeedback() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return

    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      const target = (e.target as HTMLElement)?.closest(
        'button, a, [role="button"], input[type="submit"], input[type="button"]'
      )
      if (target && !(target as HTMLButtonElement).disabled) {
        navigator.vibrate(10)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, { passive: true })
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return null
}
