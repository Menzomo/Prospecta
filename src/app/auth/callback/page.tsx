'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notifyBetaAction } from './actions'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    // Supabase manda o erro (link expirado, já usado, inválido) direto na
    // URL de retorno — como query string ou como fragmento (#error=...),
    // dependendo do tipo de link. Se não checarmos isso aqui, a sessão nunca
    // se estabelece e o usuário só é jogado de volta pro login em silêncio,
    // sem nenhuma explicação do motivo (o caso relatado com o link de "esqueci
    // minha senha").
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorDescription = searchParams.get('error_description') ?? hashParams.get('error_description')
    if (errorDescription) {
      handled.current = true
      router.replace(`/login?error=${encodeURIComponent(errorDescription)}`)
      return
    }

    const supabase = createClient()
    const next = searchParams.get('next')
    // "//dominio-malicioso.com" também passa em startsWith('/') e o
    // navegador trata como redirect pra outro domínio (open redirect) —
    // exige começar com "/" mas não com "//".
    const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled.current) return

      // PASSWORD_RECOVERY é o evento disparado ao processar o link de
      // redefinição de senha (não SIGNED_IN) — sem tratar ele aqui, quem
      // clica em "esqueci minha senha" fica preso na tela "Entrando...".
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        handled.current = true
        notifyBetaAction(session.user.id).catch(() => {})
        router.replace(destination)
      } else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') && !session) {
        handled.current = true
        router.replace('/login?error=' + encodeURIComponent('Link inválido ou expirado. Solicite a redefinição de senha novamente.'))
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-on-surface-muted">Entrando...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-on-surface-muted">Entrando...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
