'use client'

import { useEffect } from 'react'

/**
 * O Safari no iOS dá zoom automático ao focar o campo de senha/email na
 * tela de login — comportamento que a gente quer manter lá. O problema é
 * que a navegação do login até o dashboard é client-side (sem recarregar a
 * página), então esse zoom "gruda" e o dashboard também abre zoomado
 * (reportado pelo usuário).
 *
 * Monta uma vez só quando o layout autenticado carrega (login → app), não a
 * cada navegação interna entre páginas do app — senão atrapalharia quem dá
 * zoom de propósito durante a sessão. O truque: força maximum-scale=1 por
 * um instante pro Safari recalcular e voltar pra escala 1, depois devolve o
 * viewport original — o usuário continua podendo dar zoom manual depois.
 */
export function ResetZoomOnMount() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return

    const original = meta.content
    meta.content = `${original}, maximum-scale=1`
    const id = setTimeout(() => {
      meta.content = original
    }, 300)

    return () => clearTimeout(id)
  }, [])

  return null
}
