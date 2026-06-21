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
    const supabase = createClient()
    const next = searchParams.get('next')
    const destination = next?.startsWith('/') ? next : '/dashboard'

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled.current) return

      if (event === 'SIGNED_IN' && session) {
        handled.current = true
        notifyBetaAction(session.user.id).catch(() => {})
        router.replace(destination)
      } else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') && !session) {
        handled.current = true
        router.replace('/login')
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
